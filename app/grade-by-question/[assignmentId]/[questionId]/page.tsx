'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Assignment {
  _id: string;
  title: string;
  totalPoints: number;
}

interface Question {
  _id: string;
  questionText: string;
  questionNumber: number;
  pointsPercentage: number;
}

interface Submission {
  _id: string;
  assignmentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
}

interface CriteriaEvaluation {
  rubricId: string;
  selectedLevelIndex: number;
  feedback: string;
  agentSuggestions?: AgentSuggestion[];
}

interface Answer {
  _id: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  criteriaEvaluations: CriteriaEvaluation[];
  pointsPercentage?: number;
}

interface RubricLevel {
  name: string;
  description: string;
  percentage: number;
}

interface Rubric {
  _id: string;
  questionId: string;
  criteriaName: string;
  levels: RubricLevel[];
}

interface GradingAgent {
  _id: string;
  questionId: string;
  name: string;
  color: string;
}

interface AgentSuggestion {
  agentId: string;
  suggestedLevelIndex: number;
}

interface AnswerWithSubmission extends Answer {
  submission?: Submission;
}

export default function GradeByQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;
  const questionId = params.questionId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerWithSubmission[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [gradingAgents, setGradingAgents] = useState<GradingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [generatingAgent, setGeneratingAgent] = useState<string | null>(null);
  const [openAgentMenuId, setOpenAgentMenuId] = useState<string | null>(null);
  const [generatingAllAgents, setGeneratingAllAgents] = useState(false);
  const [creatingAgents, setCreatingAgents] = useState(false);

  // Local state for editing
  const [localAnswers, setLocalAnswers] = useState<{ [answerId: string]: Answer }>({});
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  
  // Debounce timer for auto-save
  const feedbackDebounceTimerRef = useState<{ [key: string]: NodeJS.Timeout }>({})[0];

  useEffect(() => {
    fetchData();
  }, [assignmentId, questionId]);

  // Close agent menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenAgentMenuId(null);
    };

    if (openAgentMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openAgentMenuId]);

  useEffect(() => {
    // Initialize local answers state ONLY when answers array actually changes
    // Preserve existing localAnswers and only update/add new ones
    setLocalAnswers(prevLocalAnswers => {
      const localState: { [answerId: string]: Answer } = { ...prevLocalAnswers };
      
      answers.forEach((answer) => {
        // Only initialize if this answer doesn't exist in local state yet
        // OR if we need to preserve server data (after save/fetch)
        if (!localState[answer._id!]) {
          localState[answer._id!] = { ...answer };
        } else {
          // Preserve local changes but update answer text from server
          localState[answer._id!] = {
            ...localState[answer._id!],
            answerText: answer.answerText,
            // Keep local criteriaEvaluations which may have agent suggestions
          };
        }
      });
      
      return localState;
    });
  }, [answers]);

  useEffect(() => {
    // Auto-select first answer if none selected
    if (answers.length > 0 && !selectedAnswerId) {
      setSelectedAnswerId(answers[0]._id);
    }
  }, [answers, selectedAnswerId]);

  const fetchData = async () => {
    try {
      // Fetch assignment
      const assignmentRes = await fetch(`/api/assignments/${assignmentId}`);
      const assignmentData = await assignmentRes.json();
      setAssignment(assignmentData);

      // Fetch all questions for this assignment (for navigation)
      const questionsRes = await fetch(`/api/questions?assignmentId=${assignmentId}`);
      const questionsData = await questionsRes.json();
      setQuestions(questionsData);

      // Find current question
      const currentQuestion = questionsData.find((q: Question) => q._id === questionId);
      setQuestion(currentQuestion);

      // Fetch all submissions for this assignment
      const submissionsRes = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
      const submissionsData = await submissionsRes.json();
      setSubmissions(submissionsData);

      // Fetch all answers for this specific question
      const answersRes = await fetch(`/api/answers?questionId=${questionId}`);
      const answersData = await answersRes.json();

      // Combine answers with submission data
      const answersWithSubmissions = answersData.map((answer: Answer) => {
        const submission = submissionsData.find((s: Submission) => s._id === answer.submissionId);
        return {
          ...answer,
          submission,
        };
      });
      setAnswers(answersWithSubmissions);

      // Fetch rubrics for this question
      const rubricsRes = await fetch(`/api/rubrics?questionId=${questionId}`);
      const rubricsData = await rubricsRes.json();
      setRubrics(rubricsData);

      // Fetch grading agents for this question
      const agentsRes = await fetch(`/api/grading-agents?questionId=${questionId}`);
      const agentsData = await agentsRes.json();
      
      // If no agents exist and not already creating them, create 3 default agents
      if (agentsData.length === 0 && !creatingAgents) {
        setCreatingAgents(true); // Prevent concurrent creation
        const defaultAgents = [];
        for (let i = 1; i <= 3; i++) {
          const agentName = `g${i}`;
          const agentColor = AGENT_COLORS[i - 1];
          
          try {
            const createRes = await fetch('/api/grading-agents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                questionId: questionId,
                name: agentName,
                color: agentColor,
              }),
            });
            
            if (createRes.ok) {
              const newAgent = await createRes.json();
              defaultAgents.push(newAgent);
            }
          } catch (error) {
            console.error(`Error creating default agent ${agentName}:`, error);
          }
        }
        setGradingAgents(defaultAgents);
        setCreatingAgents(false); // Reset flag after creation
      } else {
        setGradingAgents(agentsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };


  const selectCriteriaLevel = async (answerId: string, rubric: Rubric, levelIndex: number) => {
    const answer = localAnswers[answerId];
    const level = rubric.levels[levelIndex];

    // Find or create evaluation for this criteria
    const existingEvalIndex = answer.criteriaEvaluations.findIndex(
      (e) => e.rubricId === rubric._id
    );

    const newEvaluation: CriteriaEvaluation = {
      rubricId: rubric._id!,
      selectedLevelIndex: levelIndex,
      feedback: existingEvalIndex >= 0 ? answer.criteriaEvaluations[existingEvalIndex].feedback : '',
      agentSuggestions: existingEvalIndex >= 0 ? answer.criteriaEvaluations[existingEvalIndex].agentSuggestions : [],
    };

    let updatedEvaluations: CriteriaEvaluation[];
    if (existingEvalIndex >= 0) {
      updatedEvaluations = [...answer.criteriaEvaluations];
      updatedEvaluations[existingEvalIndex] = newEvaluation;
    } else {
      updatedEvaluations = [...answer.criteriaEvaluations, newEvaluation];
    }

    // Calculate average percentage from all criteria
    const totalPercentage = updatedEvaluations.reduce((sum, evaluation) => {
      const rubric = rubrics.find((r) => r._id === evaluation.rubricId);
      if (rubric) {
        const level = rubric.levels[evaluation.selectedLevelIndex];
        return sum + level.percentage;
      }
      return sum;
    }, 0);

    const averagePercentage = rubrics.length > 0 ? totalPercentage / rubrics.length : 0;

    const updatedAnswer = {
      ...answer,
      criteriaEvaluations: updatedEvaluations,
      pointsPercentage: averagePercentage,
    };

    // Update local state
    setLocalAnswers({
      ...localAnswers,
      [answerId]: updatedAnswer,
    });

    // Auto-save to database
    setSaving(true);
    setSaveMessage('Saving...');
    try {
      const response = await fetch('/api/answers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAnswer),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to auto-save answer:', error);
        setSaveMessage('✗ Auto-save failed');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('✓ Saved');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch (error) {
      console.error('Error auto-saving answer:', error);
      setSaveMessage('✗ Auto-save failed');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateCriteriaFeedback = (answerId: string, rubricId: string, feedback: string) => {
    const answer = localAnswers[answerId];
    const evalIndex = answer.criteriaEvaluations.findIndex((e) => e.rubricId === rubricId);

    if (evalIndex >= 0) {
      const updatedEvaluations = [...answer.criteriaEvaluations];
      updatedEvaluations[evalIndex] = {
        ...updatedEvaluations[evalIndex],
        feedback,
      };

      const updatedAnswer = {
        ...answer,
        criteriaEvaluations: updatedEvaluations,
      };

      setLocalAnswers({
        ...localAnswers,
        [answerId]: updatedAnswer,
      });

      // Debounce auto-save for feedback (wait 1 second after typing stops)
      const debounceKey = `${answerId}-${rubricId}`;
      if (feedbackDebounceTimerRef[debounceKey]) {
        clearTimeout(feedbackDebounceTimerRef[debounceKey]);
      }
      
      feedbackDebounceTimerRef[debounceKey] = setTimeout(async () => {
        setSaving(true);
        setSaveMessage('Saving...');
        try {
          const response = await fetch('/api/answers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedAnswer),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to auto-save feedback:', error);
            setSaveMessage('✗ Auto-save failed');
            setTimeout(() => setSaveMessage(''), 3000);
          } else {
            setSaveMessage('✓ Saved');
            setTimeout(() => setSaveMessage(''), 2000);
          }
        } catch (error) {
          console.error('Error auto-saving feedback:', error);
          setSaveMessage('✗ Auto-save failed');
          setTimeout(() => setSaveMessage(''), 3000);
        } finally {
          setSaving(false);
        }
      }, 1000);
    }
  };

  const updateAnswerText = (answerId: string, newText: string) => {
    setLocalAnswers({
      ...localAnswers,
      [answerId]: {
        ...localAnswers[answerId],
        answerText: newText,
      },
    });
  };

  const saveAnswer = async (answerId: string) => {
    setSaving(true);
    setSaveMessage('');
    try {
      const answer = localAnswers[answerId];
      console.log('Saving answer:', answerId, answer);

      const response = await fetch('/api/answers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answer),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save answer:', error);
        setSaveMessage(`✗ Error: ${error.details || 'Failed to save answer'}`);
        return false;
      }

      // Update the answers array with the saved data
      const updatedAnswer = await response.json();
      setAnswers(answers.map(a => a._id === answerId ? { ...updatedAnswer, submission: a.submission } : a));

      setSaveMessage('✓ Answer saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      return true;
    } catch (error) {
      console.error('Error saving answer:', error);
      setSaveMessage('✗ Error saving answer');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const navigateToQuestion = (targetQuestionId: string) => {
    router.push(`/grade-by-question/${assignmentId}/${targetQuestionId}`);
  };

  // Agent colors for visual distinction
  const AGENT_COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  const addGradingAgent = async () => {
    if (!question) return;
    
    const nextAgentNumber = gradingAgents.length + 1;
    const agentName = `g${nextAgentNumber}`;
    const agentColor = AGENT_COLORS[(nextAgentNumber - 1) % AGENT_COLORS.length];

    try {
      const response = await fetch('/api/grading-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question._id,
          name: agentName,
          color: agentColor,
        }),
      });

      if (response.ok) {
        const newAgent = await response.json();
        setGradingAgents([...gradingAgents, newAgent]);
      }
    } catch (error) {
      console.error('Error adding agent:', error);
    }
  };

  const removeGradingAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/grading-agents?agentId=${agentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setGradingAgents(gradingAgents.filter(a => a._id !== agentId));
        // Remove agent suggestions from all answers
        const updatedLocalAnswers = { ...localAnswers };
        Object.keys(updatedLocalAnswers).forEach(answerId => {
          const answer = updatedLocalAnswers[answerId];
          answer.criteriaEvaluations = answer.criteriaEvaluations.map(evaluation => ({
            ...evaluation,
            agentSuggestions: (evaluation.agentSuggestions || []).filter(s => s.agentId !== agentId),
          }));
        });
        setLocalAnswers(updatedLocalAnswers);
      }
    } catch (error) {
      console.error('Error removing agent:', error);
    }
  };

  const generateAgentSuggestions = async (agentId: string) => {
    if (!question) return;
    
    setGeneratingAgent(agentId);

    try {
      // Generate suggestions for all answers
      for (const answerWithSubmission of answers) {
        const response = await fetch('/api/agent-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            questionText: question.questionText,
            currentAnswer: answerWithSubmission,
            allAnswers: answers.map(a => ({ answerText: a.answerText })),
            rubrics: rubrics,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          
          // Update state for this specific answer using functional form to get latest state
          setLocalAnswers(prevAnswers => {
            const answer = prevAnswers[answerWithSubmission._id] || answerWithSubmission;
            
            // Update local answers with agent suggestions
            const updatedEvaluations = answer.criteriaEvaluations.map(evaluation => {
              const suggestion = result.suggestions.find(
                (s: any) => s.rubricId === evaluation.rubricId
              );

              if (suggestion) {
                const existingSuggestions = evaluation.agentSuggestions || [];
                const filteredSuggestions = existingSuggestions.filter(
                  s => s.agentId !== agentId
                );
                return {
                  ...evaluation,
                  agentSuggestions: [
                    ...filteredSuggestions,
                    {
                      agentId,
                      suggestedLevelIndex: suggestion.suggestedLevelIndex,
                    },
                  ],
                };
              }

              return evaluation;
            });

            // Add suggestions for rubrics not yet evaluated
            const evaluatedRubricIds = answer.criteriaEvaluations.map(e => e.rubricId);
            const newEvaluations = result.suggestions
              .filter((s: any) => !evaluatedRubricIds.includes(s.rubricId))
              .map((s: any) => ({
                rubricId: s.rubricId,
                selectedLevelIndex: s.suggestedLevelIndex,
                feedback: '',
                agentSuggestions: [
                  {
                    agentId,
                    suggestedLevelIndex: s.suggestedLevelIndex,
                  },
                ],
              }));

            // Return updated state with this answer's new suggestions
            return {
              ...prevAnswers,
              [answer._id!]: {
                ...answer,
                criteriaEvaluations: [...updatedEvaluations, ...newEvaluations],
              },
            };
          });
        }
      }
    } catch (error) {
      console.error('Error generating agent suggestions:', error);
    } finally {
      setGeneratingAgent(null);
    }
  };

  const generateAllAgentSuggestions = async () => {
    if (gradingAgents.length === 0) return;
    
    setGeneratingAllAgents(true);

    try {
      // Run all agents sequentially so they don't overwrite each other
      for (const agent of gradingAgents) {
        await generateAgentSuggestions(agent._id);
      }
    } catch (error) {
      console.error('Error generating all agent suggestions:', error);
    } finally {
      setGeneratingAllAgents(false);
    }
  };

  const getQuestionMaxPoints = () => {
    if (!question || !assignment) return 0;
    return (question.pointsPercentage / 100) * assignment.totalPoints;
  };

  const getGradedCount = () => {
    return answers.filter(a => {
      const answer = localAnswers[a._id];
      return answer && answer.criteriaEvaluations.length === rubrics.length && rubrics.length > 0;
    }).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!assignment || !question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Question not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[95%] mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 border border-gray-200">
          {/* Compact Header - Single Row */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-4 flex-1">
              <Link
                href={`/assignment/${assignment._id}`}
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                ← Back
              </Link>
              <div className="border-l border-gray-300 h-6"></div>
              <h1 className="text-xl font-bold text-gray-900">Grade by Question</h1>
              <span className="text-gray-600">•</span>
              <p className="text-gray-600">{assignment.title}</p>
              
              {/* Question Navigation - Inline */}
              <div className="border-l border-gray-300 h-6"></div>
              <div className="flex gap-2">
                {questions.map((q) => (
                  <button
                    key={q._id}
                    onClick={() => navigateToQuestion(q._id)}
                    className={`px-3 py-1 rounded-lg font-semibold text-sm transition-colors ${
                      q._id === questionId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    Q{q.questionNumber}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-700 font-semibold">
                  Progress: {getGradedCount()} / {answers.length}
                </p>
                {rubrics.length === 0 && (
                  <p className="text-xs text-orange-600">⚠️ No rubrics</p>
                )}
              </div>

              {/* Agent Circles */}
              <div className="flex items-center gap-2">
                {/* Existing Agent Circles */}
                {gradingAgents.map((agent) => (
                  <div
                    key={agent._id}
                    className="relative"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer transition-all ${
                        generatingAgent === agent._id ? 'animate-pulse' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: agent.color }}
                      title={`Agent ${agent.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenAgentMenuId(openAgentMenuId === agent._id ? null : agent._id);
                      }}
                    >
                      {agent.name}
                    </div>

                    {/* Click Popup Menu */}
                    {openAgentMenuId === agent._id && generatingAgent === null && !generatingAllAgents && (
                      <div 
                        className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 min-w-[120px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setOpenAgentMenuId(null);
                            generateAgentSuggestions(agent._id);
                          }}
                          className="w-full px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-t-lg transition-colors"
                        >
                          ▶️ Run
                        </button>
                        <div className="border-t border-gray-200"></div>
                        <button
                          onClick={() => {
                            setOpenAgentMenuId(null);
                            removeGradingAgent(agent._id);
                          }}
                          className="w-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Agent Circle */}
                <button
                  onClick={addGradingAgent}
                  disabled={generatingAgent !== null || generatingAllAgents}
                  className="w-10 h-10 rounded-full border-2 border-dashed border-purple-400 flex items-center justify-center text-purple-600 hover:bg-purple-50 hover:border-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add new agent"
                >
                  <span className="text-xl font-bold">+</span>
                </button>
              </div>

              {/* Run All Button */}
              {gradingAgents.length > 0 && (
                <button
                  onClick={generateAllAgentSuggestions}
                  disabled={generatingAgent !== null || generatingAllAgents}
                  className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                    generatingAllAgents
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {generatingAllAgents ? 'Running All...' : '▶️ Run All'}
                </button>
              )}

              {/* Auto-save status indicator */}
              {saveMessage && (
                <span
                  className={`font-semibold text-sm ${
                    saveMessage.includes('✓') ? 'text-green-600' : saveMessage.includes('Saving') ? 'text-blue-600' : 'text-red-600'
                  }`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
          </div>

          {/* Current Question Info - Compact */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-700 flex-1">{question.questionText}</p>
              <div className="ml-4 text-right flex-shrink-0">
                <p className="text-sm text-indigo-600 font-semibold">
                  {question.pointsPercentage}% • {getQuestionMaxPoints().toFixed(1)} pts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Split Layout: Answers on Left, Rubrics on Right */}
        {answers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
            <p className="text-gray-600 text-lg">No submissions for this question yet.</p>
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Left Side - Answers List */}
            <div className="w-1/5 space-y-3 pr-2">
              {answers.map((answerWithSubmission) => {
                const answer = localAnswers[answerWithSubmission._id] || answerWithSubmission;
                const submission = answerWithSubmission.submission;
                const isSelected = selectedAnswerId === answer._id;
                const isGraded = answer.criteriaEvaluations.length === rubrics.length && rubrics.length > 0;

                return (
                  <div
                    key={answer._id}
                    onClick={() => setSelectedAnswerId(answer._id!)}
                    className={`cursor-pointer rounded-lg p-3 transition-all border-2 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 shadow-lg'
                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    {/* Status Header */}
                    <div className="mb-2 flex items-center justify-end">
                      {isGraded ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <span className="text-xs text-gray-400 font-semibold">Not graded</span>
                      )}
                    </div>

                    {/* Answer Preview */}
                    <div className="text-sm text-gray-700 line-clamp-3 bg-gray-50 p-2 rounded mb-2">
                      {answer.answerText}
                    </div>

                    {/* Bottom Row: Criteria Tags + Overall Score */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Criteria Score Tags */}
                      <div className="flex flex-wrap gap-1">
                        {answer.criteriaEvaluations.map((evaluation) => {
                          const rubric = rubrics.find((r) => r._id === evaluation.rubricId);
                          if (!rubric) return null;
                          const level = rubric.levels[evaluation.selectedLevelIndex];

                          return (
                            <span
                              key={evaluation.rubricId}
                              className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold"
                            >
                              {level.percentage}%
                            </span>
                          );
                        })}
                      </div>

                      {/* Overall Score */}
                      {isGraded && (
                        <span className="text-base font-bold text-indigo-600">
                          {(answer.pointsPercentage || 0).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle - Selected Answer Display */}
            <div className="w-3/5">
              {selectedAnswerId && localAnswers[selectedAnswerId] ? (
                <>
                  {(() => {
                    const answer = localAnswers[selectedAnswerId];
                    const answerWithSubmission = answers.find(a => a._id === selectedAnswerId);
                    const submission = answerWithSubmission?.submission;

                    return (
                      <>
                        {/* Answer Display - No Container */}
                        <div className="p-6 bg-white rounded-lg relative shadow-sm border border-gray-200">
                          <button
                            onClick={async () => {
                              if (editingAnswerId === answer._id) {
                                const saved = await saveAnswer(answer._id!);
                                if (saved) {
                                  setEditingAnswerId(null);
                                }
                              } else {
                                setEditingAnswerId(answer._id!);
                              }
                            }}
                            disabled={saving}
                            className={`absolute top-4 right-4 text-sm font-semibold ${
                              saving
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-indigo-600 hover:text-indigo-800'
                            }`}
                          >
                            {editingAnswerId === answer._id ? '✓ Done' : '✏️ Edit'}
                          </button>
                          {editingAnswerId === answer._id ? (
                            <textarea
                              value={answer.answerText}
                              onChange={(e) => updateAnswerText(answer._id!, e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-base font-mono"
                              rows={20}
                            />
                          ) : (
                            <div className="prose prose-base max-w-none text-gray-700">
                              <ReactMarkdown>{answer.answerText}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-gray-200">
                  <p className="text-gray-600">Select an answer to view</p>
                </div>
              )}
            </div>

            {/* Right Side - Rubric Grading Panel */}
            <div className="w-1/5">
              {selectedAnswerId && localAnswers[selectedAnswerId] ? (
                <>
                  {(() => {
                    const answer = localAnswers[selectedAnswerId];
                    const questionMaxPoints = getQuestionMaxPoints();

                    return (
                      <>
                        {/* Score Summary - At Top */}
                        <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">Final Score:</p>
                              <p className="text-xs text-gray-600">
                                {(answer.pointsPercentage || 0).toFixed(1)}%
                              </p>
                            </div>
                            <span className="text-2xl font-bold text-indigo-600">
                              {(((answer.pointsPercentage || 0) / 100) * questionMaxPoints).toFixed(2)} /{' '}
                              {questionMaxPoints.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Rubric Grading - No Container */}
                        {rubrics.length > 0 ? (
                          <div className="space-y-4">
                            {rubrics.map((rubric) => {
                              const evaluation = answer.criteriaEvaluations.find(
                                (e) => e.rubricId === rubric._id
                              );

                              return (
                                <div
                                  key={rubric._id}
                                  className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm"
                                >
                                  <h5 className="font-bold text-gray-800 mb-2 text-sm">
                                    {rubric.criteriaName}
                                    {evaluation && (
                                      <span className="ml-2 text-xs text-green-600">✓</span>
                                    )}
                                  </h5>

                                  <div className="mb-2">
                                    {/* Level Options with Agent Suggestions */}
                                    <div className="space-y-2">
                                      {rubric.levels.map((level, levelIdx) => {
                                        const isSelected = evaluation?.selectedLevelIndex === levelIdx;
                                        const agentSuggestions = evaluation?.agentSuggestions || [];
                                        const agentsForThisLevel = agentSuggestions.filter(
                                          s => s.suggestedLevelIndex === levelIdx
                                        );

                                        return (
                                          <button
                                            key={levelIdx}
                                            type="button"
                                            onClick={() => selectCriteriaLevel(answer._id!, rubric, levelIdx)}
                                            className={`w-full p-2 rounded-lg border-2 text-left transition-all ${
                                              isSelected
                                                ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                                : 'border-gray-300 hover:border-indigo-400 bg-white'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2 flex-1">
                                                {/* Agent suggestion circles */}
                                                {agentsForThisLevel.length > 0 && (
                                                  <div className="flex gap-1">
                                                    {agentsForThisLevel.map((suggestion) => {
                                                      const agent = gradingAgents.find(
                                                        a => a._id === suggestion.agentId
                                                      );
                                                      if (!agent) return null;
                                                      return (
                                                        <div
                                                          key={agent._id}
                                                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                          style={{ backgroundColor: agent.color }}
                                                          title={`Agent ${agent.name} suggests this level`}
                                                        >
                                                          {agent.name}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                                <div className="flex-1">
                                                  <p className="font-semibold text-gray-800 text-xs">
                                                    {level.name}
                                                  </p>
                                                  <p className="text-xs text-gray-600 line-clamp-1">
                                                    {level.description}
                                                  </p>
                                                </div>
                                              </div>
                                              <span
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                  isSelected
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-200 text-gray-800'
                                                }`}
                                              >
                                                {level.percentage}%
                                              </span>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Show selected level full details */}
                                    {evaluation && (
                                      <div className="mt-2 p-2 bg-indigo-50 rounded border border-indigo-200">
                                        <p className="text-xs text-indigo-700">
                                          <span className="font-semibold">Selected:</span>{' '}
                                          {rubric.levels[evaluation.selectedLevelIndex].description}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <textarea
                                      value={evaluation?.feedback || ''}
                                      onChange={(e) =>
                                        updateCriteriaFeedback(answer._id!, rubric._id!, e.target.value)
                                      }
                                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs"
                                      rows={2}
                                      placeholder={`Feedback...`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 text-sm">
                              ⚠️ No rubrics defined for this question.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
                  <p className="text-gray-600">Select an answer to grade</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

