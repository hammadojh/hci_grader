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
}

interface Question {
  _id: string;
  questionText: string;
  questionNumber: number;
  maxPoints: number;
}

interface Answer {
  _id: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  selectedRubricId?: string;
  feedback?: string;
  pointsAwarded?: number;
}

interface Rubric {
  _id: string;
  questionId: string;
  criteria: string;
  points: number;
  description: string;
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

  useEffect(() => {
    fetchData();
  }, [submissionId]);

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

  const updateAnswer = async (answerId: string, updates: Partial<Answer>) => {
    await fetch('/api/answers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: answerId, ...updates }),
    });
    fetchData();
  };

  const selectRubric = (answer: Answer, rubric: Rubric) => {
    updateAnswer(answer._id!, {
      selectedRubricId: rubric._id,
      pointsAwarded: rubric.points,
    });
  };

  const updateFeedback = (answer: Answer, feedback: string) => {
    updateAnswer(answer._id!, { feedback });
  };

  const updatePoints = (answer: Answer, points: number) => {
    updateAnswer(answer._id!, { pointsAwarded: points });
  };

  const getTotalPoints = () => {
    return answers.reduce((sum, answer) => sum + (answer.pointsAwarded || 0), 0);
  };

  const getMaxTotalPoints = () => {
    return questions.reduce((sum, question) => sum + question.maxPoints, 0);
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
                {getTotalPoints()} / {getMaxTotalPoints()}
              </p>
              <p className="text-gray-600 text-sm">Total Points</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question) => {
            const answer = answers.find((a) => a.questionId === question._id);
            const questionRubrics = rubrics[question._id] || [];

            return (
              <div key={question._id} className="bg-white rounded-2xl shadow-xl p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    Question {question.questionNumber}
                  </h2>
                  <p className="text-gray-700 mb-2">{question.questionText}</p>
                  <p className="text-sm text-gray-600">Max Points: {question.maxPoints}</p>
                </div>

                {answer && (
                  <>
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                      <h3 className="font-semibold text-gray-800 mb-2">Student's Answer:</h3>
                      <p className="text-gray-700">{answer.answerText}</p>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-800 mb-3">Select Rubric:</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {questionRubrics.map((rubric) => (
                          <button
                            key={rubric._id}
                            onClick={() => selectRubric(answer, rubric)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              answer.selectedRubricId === rubric._id
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 mb-1">{rubric.criteria}</p>
                                <p className="text-sm text-gray-600">{rubric.description}</p>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ml-4 ${
                                  answer.selectedRubricId === rubric._id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {rubric.points} pts
                              </span>
                            </div>
                          </button>
                        ))}
                        {questionRubrics.length === 0 && (
                          <p className="text-gray-500 text-sm">No rubrics available for this question</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-800 mb-2">Custom Points (Optional):</h3>
                      <input
                        type="number"
                        value={answer.pointsAwarded || 0}
                        onChange={(e) => updatePoints(answer, Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        max={question.maxPoints}
                        min={0}
                      />
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-800 mb-2">Feedback:</h3>
                      <textarea
                        value={answer.feedback || ''}
                        onChange={(e) => updateFeedback(answer, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows={4}
                        placeholder="Provide feedback to the student..."
                      />
                    </div>

                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-800">Points Awarded:</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {answer.pointsAwarded || 0} / {question.maxPoints}
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Grading Complete</h2>
              <p className="text-gray-600">All changes are saved automatically</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-indigo-600">
                {getTotalPoints()} / {getMaxTotalPoints()}
              </p>
              <p className="text-gray-600">
                {((getTotalPoints() / getMaxTotalPoints()) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

