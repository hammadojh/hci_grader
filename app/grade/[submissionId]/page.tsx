'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Submission {
  _id: string;
  assignmentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
}

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

export default function GradingPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [rubrics, setRubrics] = useState<{ [questionId: string]: Rubric[] }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Local state for editing
  const [localAnswers, setLocalAnswers] = useState<{ [answerId: string]: Answer }>({});

  useEffect(() => {
    fetchData();
  }, [submissionId]);

  useEffect(() => {
    // Initialize local answers state
    const localState: { [answerId: string]: Answer } = {};
    answers.forEach((answer) => {
      localState[answer._id!] = { ...answer };
    });
    setLocalAnswers(localState);
  }, [answers]);

  const fetchData = async () => {
    try {
      // Fetch submission
      const submissionRes = await fetch(`/api/submissions?assignmentId=`);
      const allSubmissions = await submissionRes.json();
      const currentSubmission = allSubmissions.find((s: Submission) => s._id === submissionId);
      setSubmission(currentSubmission);

      if (currentSubmission) {
        // Fetch assignment
        const assignmentRes = await fetch(`/api/assignments/${currentSubmission.assignmentId}`);
        const assignmentData = await assignmentRes.json();
        setAssignment(assignmentData);

        // Fetch questions
        const questionsRes = await fetch(`/api/questions?assignmentId=${currentSubmission.assignmentId}`);
        const questionsData = await questionsRes.json();
        setQuestions(questionsData);

        // Fetch answers
        const answersRes = await fetch(`/api/answers?submissionId=${submissionId}`);
        const answersData = await answersRes.json();
        setAnswers(answersData);

        // Fetch rubrics for each question
        const rubricsMap: { [questionId: string]: Rubric[] } = {};
        for (const question of questionsData) {
          const rubricsRes = await fetch(`/api/rubrics?questionId=${question._id}`);
          const rubricsData = await rubricsRes.json();
          rubricsMap[question._id] = rubricsData;
        }
        setRubrics(rubricsMap);
      }

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
      // Validate that all criteria have been evaluated
      for (const answerId in localAnswers) {
        const answer = localAnswers[answerId];
        const questionRubrics = rubrics[answer.questionId] || [];
        
        if (questionRubrics.length > 0 && answer.criteriaEvaluations.length !== questionRubrics.length) {
          setSaveMessage('✗ Please select a level for all criteria before saving');
          setSaving(false);
          return;
        }
      }
      
      // Save all modified answers
      for (const answerId in localAnswers) {
        const answer = localAnswers[answerId];
        await fetch('/api/answers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(answer),
        });
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
    const questionRubrics = rubrics[answer.questionId] || [];
    const totalPercentage = updatedEvaluations.reduce((sum, evaluation) => {
      const rubric = questionRubrics.find((r) => r._id === evaluation.rubricId);
      if (rubric) {
        const level = rubric.levels[evaluation.selectedLevelIndex];
        return sum + level.percentage;
      }
      return sum;
    }, 0);
    
    const averagePercentage = questionRubrics.length > 0 ? totalPercentage / questionRubrics.length : 0;
    
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

  const getTotalPercentage = () => {
    return Object.values(localAnswers).reduce((sum, answer) => {
      const question = questions.find(q => q._id === answer.questionId);
      if (!question) return sum;
      
      const questionMaxPercentage = question.pointsPercentage;
      const earnedPercentage = ((answer.pointsPercentage || 0) / 100) * questionMaxPercentage;
      return sum + earnedPercentage;
    }, 0);
  };

  const getTotalPoints = () => {
    if (!assignment) return 0;
    return (getTotalPercentage() / 100) * assignment.totalPoints;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Submission not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <Link
            href={`/assignment/${assignment._id}`}
            className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block"
          >
            ← Back to Assignment
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Grading Submission</h1>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xl text-gray-700 mb-1">
                <span className="font-semibold">Student:</span> {submission.studentName}
              </p>
              <p className="text-gray-600 mb-1">
                <span className="font-semibold">Email:</span> {submission.studentEmail}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Assignment:</span> {assignment.title}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-600">
                {getTotalPoints().toFixed(2)} / {assignment.totalPoints}
              </p>
              <p className="text-gray-600 text-sm">Total Points</p>
              <p className="text-lg text-indigo-600 mt-1">
                {getTotalPercentage().toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={saveAllGrades}
              disabled={saving}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {saving ? 'Saving...' : '💾 Save All Grades'}
            </button>
            {saveMessage && (
              <span
                className={`font-semibold ${
                  saveMessage.includes('✓') ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question) => {
            const answer = Object.values(localAnswers).find((a) => a.questionId === question._id);
            const questionRubrics = rubrics[question._id] || [];
            const questionMaxPoints = (question.pointsPercentage / 100) * assignment.totalPoints;

            return (
              <div key={question._id} className="bg-white rounded-2xl shadow-xl p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    Question {question.questionNumber}
                  </h2>
                  <p className="text-gray-700 mb-2">{question.questionText}</p>
                  <p className="text-sm text-indigo-600 font-semibold">
                    Worth: {question.pointsPercentage}% of total ({questionMaxPoints.toFixed(2)} points)
                  </p>
                </div>

                {answer && (
                  <>
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                      <h3 className="font-semibold text-gray-800 mb-2">Student's Answer:</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{answer.answerText}</p>
                    </div>

                    {questionRubrics.length > 0 ? (
                      <>
                        <h3 className="font-semibold text-gray-800 mb-4 text-lg">
                          Evaluate Each Criteria:
                        </h3>
                        <div className="space-y-6">
                          {questionRubrics.map((rubric) => {
                            const evaluation = answer.criteriaEvaluations.find(
                              (e) => e.rubricId === rubric._id
                            );

                            return (
                              <div key={rubric._id} className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
                                <h4 className="font-bold text-gray-800 mb-4 text-lg">
                                  {rubric.criteriaName}
                                  {evaluation && (
                                    <span className="ml-3 text-sm text-green-600">✓ Evaluated</span>
                                  )}
                                  {!evaluation && (
                                    <span className="ml-3 text-sm text-orange-600">⚠ Not evaluated yet</span>
                                  )}
                                </h4>

                                <div className="mb-4">
                                  <p className="text-sm font-semibold text-gray-700 mb-2">Select Level:</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {rubric.levels.map((level, levelIdx) => {
                                      const isSelected =
                                        evaluation?.selectedLevelIndex === levelIdx;

                                      return (
                                        <button
                                          key={levelIdx}
                                          type="button"
                                          onClick={() =>
                                            selectCriteriaLevel(answer._id!, rubric, levelIdx)
                                          }
                                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                                            isSelected
                                              ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                              : 'border-gray-300 hover:border-indigo-400 bg-white'
                                          }`}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <p className="font-semibold text-gray-800 mb-1">
                                                {level.name}
                                              </p>
                                              <p className="text-sm text-gray-600">{level.description}</p>
                                            </div>
                                            <span
                                              className={`px-3 py-1 rounded-full text-sm font-semibold ml-3 ${
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
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Feedback for {rubric.criteriaName}:
                                  </label>
                                  <textarea
                                    value={evaluation?.feedback || ''}
                                    onChange={(e) =>
                                      updateCriteriaFeedback(answer._id!, rubric._id!, e.target.value)
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    rows={3}
                                    placeholder={`Explain your evaluation for ${rubric.criteriaName}...`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-800">Points for This Question:</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Average of all criteria: {(answer.pointsPercentage || 0).toFixed(1)}%
                              </p>
                            </div>
                            <span className="text-3xl font-bold text-indigo-600">
                              {((answer.pointsPercentage || 0) / 100 * questionMaxPoints).toFixed(2)} / {questionMaxPoints.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800">
                          ⚠️ No rubrics defined for this question. Please add rubrics in the assignment settings.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!answer && (
                  <p className="text-gray-500 italic">No answer submitted for this question</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Summary</h2>
              <p className="text-gray-600">Review and save your grading</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-indigo-600">
                {getTotalPoints().toFixed(2)} / {assignment.totalPoints}
              </p>
              <p className="text-gray-600">
                {getTotalPercentage().toFixed(1)}% overall
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={saveAllGrades}
              disabled={saving}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {saving ? 'Saving...' : '💾 Save All Grades'}
            </button>
            {saveMessage && (
              <span
                className={`font-semibold ${
                  saveMessage.includes('✓') ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
