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

interface Answer {
  _id: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  selectedRubricId?: string;
  selectedLevelIndex?: number;
  feedback?: string;
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
        for (const question of questionsData) {
          const rubricsRes = await fetch(`/api/rubrics?questionId=${question._id}`);
          const rubricsData = await rubricsRes.json();
          setRubrics((prev) => ({ ...prev, [question._id]: rubricsData }));
        }
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

  const selectRubricLevel = (answerId: string, rubricId: string, levelIndex: number, percentage: number) => {
    setLocalAnswers({
      ...localAnswers,
      [answerId]: {
        ...localAnswers[answerId],
        selectedRubricId: rubricId,
        selectedLevelIndex: levelIndex,
        pointsPercentage: percentage,
      },
    });
  };

  const updateFeedback = (answerId: string, feedback: string) => {
    setLocalAnswers({
      ...localAnswers,
      [answerId]: {
        ...localAnswers[answerId],
        feedback,
      },
    });
  };

  const updatePercentage = (answerId: string, percentage: number) => {
    setLocalAnswers({
      ...localAnswers,
      [answerId]: {
        ...localAnswers[answerId],
        pointsPercentage: percentage,
        selectedRubricId: undefined,
        selectedLevelIndex: undefined,
      },
    });
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
                      <p className="text-gray-700">{answer.answerText}</p>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-800 mb-3">Select Rubric Criteria & Level:</h3>
                      <div className="space-y-4">
                        {questionRubrics.map((rubric) => (
                          <div key={rubric._id} className="border-2 border-gray-200 rounded-lg p-4">
                            <h4 className="font-bold text-gray-800 mb-3">{rubric.criteriaName}</h4>
                            <div className="grid grid-cols-1 gap-2">
                              {rubric.levels.map((level, levelIdx) => {
                                const isSelected =
                                  answer.selectedRubricId === rubric._id &&
                                  answer.selectedLevelIndex === levelIdx;
                                
                                return (
                                  <button
                                    key={levelIdx}
                                    type="button"
                                    onClick={() =>
                                      selectRubricLevel(answer._id!, rubric._id!, levelIdx, level.percentage)
                                    }
                                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                                      isSelected
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-800 mb-1">{level.name}</p>
                                        <p className="text-sm text-gray-600">{level.description}</p>
                                      </div>
                                      <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold ml-2 ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-800'
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
                        ))}
                        {questionRubrics.length === 0 && (
                          <p className="text-gray-500 text-sm">No rubrics available for this question</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        Custom Percentage (Optional - overrides rubric selection):
                      </h3>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          value={answer.pointsPercentage || 0}
                          onChange={(e) => updatePercentage(answer._id!, Number(e.target.value))}
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          max={100}
                          min={0}
                          step={0.1}
                        />
                        <span className="text-gray-700">
                          % of question weight = {((answer.pointsPercentage || 0) / 100 * questionMaxPoints).toFixed(2)} points
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-800 mb-2">Feedback:</h3>
                      <textarea
                        value={answer.feedback || ''}
                        onChange={(e) => updateFeedback(answer._id!, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows={4}
                        placeholder="Provide feedback to the student..."
                      />
                    </div>

                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-800">Points for This Question:</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {((answer.pointsPercentage || 0) / 100 * questionMaxPoints).toFixed(2)} / {questionMaxPoints.toFixed(2)}
                      </span>
                    </div>
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
