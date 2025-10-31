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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Local state for editing
  const [localAnswers, setLocalAnswers] = useState<{ [answerId: string]: Answer }>({});
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [assignmentId, questionId]);

  useEffect(() => {
    // Initialize local answers state
    const localState: { [answerId: string]: Answer } = {};
    answers.forEach((answer) => {
      localState[answer._id!] = { ...answer };
    });
    setLocalAnswers(localState);
    
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

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const saveAllGrades = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      // Validate that all criteria have been evaluated (skip answers with empty text)
      for (const answerId in localAnswers) {
        const answer = localAnswers[answerId];

        // Skip validation for newly added answers that haven't been filled out
        const isNewEmptyAnswer = !answer.answerText || answer.answerText === '[Enter student answer here]';

        if (!isNewEmptyAnswer && rubrics.length > 0 && answer.criteriaEvaluations.length !== rubrics.length) {
          setSaveMessage('✗ Please select a level for all criteria before saving');
          setSaving(false);
          return;
        }
      }

      // Save all modified answers
      for (const answerId in localAnswers) {
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
          throw new Error(`Failed to save answer: ${error.details || 'Unknown error'}`);
        }
      }

      setSaveMessage('✓ Grades saved successfully!');
      await fetchData(); // Refresh data

      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('✗ Error saving grades');
      console.error('Error saving grades:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectCriteriaLevel = (answerId: string, rubric: Rubric, levelIndex: number) => {
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

    setLocalAnswers({
      ...localAnswers,
      [answerId]: {
        ...answer,
        criteriaEvaluations: updatedEvaluations,
        pointsPercentage: averagePercentage,
      },
    });
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

      setLocalAnswers({
        ...localAnswers,
        [answerId]: {
          ...answer,
          criteriaEvaluations: updatedEvaluations,
        },
      });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-[98%] mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-4 mb-4">
          {/* Compact Header - Single Row */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-4 flex-1">
              <Link
                href={`/assignment/${assignment._id}`}
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                ← Back
              </Link>
              <div className="border-l border-gray-300 h-6"></div>
              <h1 className="text-xl font-bold text-gray-800">Grade by Question</h1>
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
              <button
                onClick={saveAllGrades}
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors ${
                  saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {saving ? 'Saving...' : '💾 Save'}
              </button>
              {saveMessage && (
                <span
                  className={`font-semibold text-sm ${
                    saveMessage.includes('✓') ? 'text-green-600' : 'text-red-600'
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
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
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
                <div className="bg-white rounded-xl shadow-xl p-6">
                  {(() => {
                    const answer = localAnswers[selectedAnswerId];
                    const answerWithSubmission = answers.find(a => a._id === selectedAnswerId);
                    const submission = answerWithSubmission?.submission;

                    return (
                      <>
                        {/* Answer Display */}
                        <div className="p-6 bg-blue-50 rounded-lg relative">
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
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-xl p-8 text-center">
                  <p className="text-gray-600">Select an answer to view</p>
                </div>
              )}
            </div>

            {/* Right Side - Rubric Grading Panel */}
            <div className="w-1/5">
              {selectedAnswerId && localAnswers[selectedAnswerId] ? (
                <div className="bg-white rounded-xl shadow-xl p-6">
                  {(() => {
                    const answer = localAnswers[selectedAnswerId];
                    const questionMaxPoints = getQuestionMaxPoints();

                    return (
                      <>
                        {/* Rubric Grading */}
                        {rubrics.length > 0 ? (
                          <>
                            <h4 className="font-semibold text-gray-800 mb-4 text-lg">
                              Grade Rubrics:
                            </h4>
                            <div className="space-y-4 pr-2">
                              {rubrics.map((rubric) => {
                                const evaluation = answer.criteriaEvaluations.find(
                                  (e) => e.rubricId === rubric._id
                                );

                                return (
                                  <div
                                    key={rubric._id}
                                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                                  >
                                    <h5 className="font-bold text-gray-800 mb-2 text-sm">
                                      {rubric.criteriaName}
                                      {evaluation && (
                                        <span className="ml-2 text-xs text-green-600">✓</span>
                                      )}
                                    </h5>

                                    <div className="mb-2">
                                      <select
                                        value={evaluation?.selectedLevelIndex ?? ''}
                                        onChange={(e) => {
                                          if (e.target.value !== '') {
                                            selectCriteriaLevel(answer._id!, rubric, Number(e.target.value));
                                          }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                                      >
                                        <option value="">Select level...</option>
                                        {rubric.levels.map((level, levelIdx) => (
                                          <option key={levelIdx} value={levelIdx}>
                                            {level.name} ({level.percentage}%) - {level.description}
                                          </option>
                                        ))}
                                      </select>
                                      
                                      {/* Show selected level details */}
                                      {evaluation && (
                                        <div className="mt-2 p-2 bg-indigo-50 rounded border border-indigo-200">
                                          <div className="flex justify-between items-start mb-1">
                                            <p className="font-semibold text-indigo-900 text-xs">
                                              {rubric.levels[evaluation.selectedLevelIndex].name}
                                            </p>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                                              {rubric.levels[evaluation.selectedLevelIndex].percentage}%
                                            </span>
                                          </div>
                                          <p className="text-xs text-indigo-700">
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

                            {/* Score Summary - Compact */}
                            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
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
                          </>
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
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-xl p-8 text-center">
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

