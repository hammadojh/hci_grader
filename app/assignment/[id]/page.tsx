'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  totalPoints: number;
}

interface Question {
  _id: string;
  assignmentId: string;
  questionText: string;
  questionNumber: number;
  pointsPercentage: number;
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

interface Submission {
  _id: string;
  assignmentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
}

export default function AssignmentDetail() {
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'submissions'>('questions');
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Question form state
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [pointsPercentage, setPointsPercentage] = useState(0);

  // Rubric form state
  const [selectedQuestionForRubric, setSelectedQuestionForRubric] = useState<string | null>(null);
  const [rubrics, setRubrics] = useState<{ [questionId: string]: Rubric[] }>({});
  const [rubricCriteriaName, setRubricCriteriaName] = useState('');
  const [rubricLevels, setRubricLevels] = useState<RubricLevel[]>([
    { name: '', description: '', percentage: 0 },
  ]);

  // Submission form state
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});

  useEffect(() => {
    fetchAssignment();
    fetchQuestions();
    fetchSubmissions();
  }, [assignmentId]);

  useEffect(() => {
    questions.forEach((q) => fetchRubrics(q._id));
  }, [questions]);

  const fetchAssignment = async () => {
    const res = await fetch(`/api/assignments/${assignmentId}`);
    const data = await res.json();
    setAssignment(data);
  };

  const fetchQuestions = async () => {
    const res = await fetch(`/api/questions?assignmentId=${assignmentId}`);
    const data = await res.json();
    setQuestions(data);
  };

  const fetchRubrics = async (questionId: string) => {
    const res = await fetch(`/api/rubrics?questionId=${questionId}`);
    const data = await res.json();
    setRubrics((prev) => ({ ...prev, [questionId]: data }));
  };

  const fetchSubmissions = async () => {
    const res = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
    const data = await res.json();
    setSubmissions(data);
  };

  const getTotalPercentage = () => {
    return questions.reduce((sum, q) => sum + q.pointsPercentage, 0);
  };

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const questionNumber = questions.length + 1;
    await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId,
        questionText,
        questionNumber,
        pointsPercentage,
      }),
    });
    setQuestionText('');
    setPointsPercentage(0);
    setShowQuestionForm(false);
    fetchQuestions();
  };

  const addRubricLevel = () => {
    setRubricLevels([...rubricLevels, { name: '', description: '', percentage: 0 }]);
  };

  const removeRubricLevel = (index: number) => {
    if (rubricLevels.length > 1) {
      setRubricLevels(rubricLevels.filter((_, i) => i !== index));
    }
  };

  const updateRubricLevel = (index: number, field: keyof RubricLevel, value: string | number) => {
    const updated = [...rubricLevels];
    updated[index] = { ...updated[index], [field]: value };
    setRubricLevels(updated);
  };

  const createRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionForRubric) return;

    await fetch('/api/rubrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: selectedQuestionForRubric,
        criteriaName: rubricCriteriaName,
        levels: rubricLevels,
      }),
    });
    setRubricCriteriaName('');
    setRubricLevels([{ name: '', description: '', percentage: 0 }]);
    fetchRubrics(selectedQuestionForRubric);
    setSelectedQuestionForRubric(null);
  };

  const createSubmission = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create submission
    const submissionRes = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId,
        studentName,
        studentEmail,
      }),
    });
    const submission = await submissionRes.json();

    // Create answers for each question
    for (const question of questions) {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission._id,
          questionId: question._id,
          answerText: answers[question._id] || '',
        }),
      });
    }

    setStudentName('');
    setStudentEmail('');
    setAnswers({});
    setShowSubmissionForm(false);
    fetchSubmissions();
  };

  const exportCSV = () => {
    window.open(`/api/export?assignmentId=${assignmentId}`, '_blank');
  };

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Link href="/" className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block">
                ← Back to Assignments
              </Link>
              <h1 className="text-4xl font-bold text-gray-800">{assignment.title}</h1>
              <p className="text-gray-600 mt-2">{assignment.description}</p>
              <p className="text-indigo-600 font-semibold mt-2">Total Points: {assignment.totalPoints}</p>
            </div>
            <button
              onClick={exportCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'questions'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Questions & Rubrics
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'submissions'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Submissions & Grading
            </button>
          </div>

          {activeTab === 'questions' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Questions</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Total Percentage: {getTotalPercentage()}% {getTotalPercentage() !== 100 && (
                      <span className="text-orange-600 font-semibold">(Should be 100%)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowQuestionForm(!showQuestionForm)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  {showQuestionForm ? 'Cancel' : '+ Add Question'}
                </button>
              </div>

              {showQuestionForm && (
                <form onSubmit={createQuestion} className="mb-8 p-6 bg-gray-50 rounded-xl">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Question Text
                    </label>
                    <textarea
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Points Percentage (% of {assignment.totalPoints} points)
                    </label>
                    <input
                      type="number"
                      value={pointsPercentage}
                      onChange={(e) => setPointsPercentage(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min={0}
                      max={100}
                      step={0.1}
                      required
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      This question will be worth {((pointsPercentage / 100) * assignment.totalPoints).toFixed(2)} points
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Add Question
                  </button>
                </form>
              )}

              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question._id} className="border border-gray-200 rounded-xl p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        Question {question.questionNumber}
                      </h3>
                      <p className="text-gray-700 mb-2">{question.questionText}</p>
                      <p className="text-sm text-indigo-600 font-semibold">
                        {question.pointsPercentage}% ({((question.pointsPercentage / 100) * assignment.totalPoints).toFixed(2)} points)
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-700">Rubrics</h4>
                        <button
                          onClick={() => setSelectedQuestionForRubric(question._id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-sm font-semibold transition-colors"
                        >
                          + Add Rubric
                        </button>
                      </div>

                      {selectedQuestionForRubric === question._id && (
                        <form onSubmit={createRubric} className="mb-4 p-4 bg-blue-50 rounded-lg">
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Criteria Name
                            </label>
                            <input
                              type="text"
                              value={rubricCriteriaName}
                              onChange={(e) => setRubricCriteriaName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., Accuracy, Completeness, Clarity"
                              required
                            />
                          </div>

                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Levels (at least 1 required)
                              </label>
                              <button
                                type="button"
                                onClick={addRubricLevel}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                              >
                                + Add Level
                              </button>
                            </div>

                            {rubricLevels.map((level, index) => (
                              <div key={index} className="bg-white p-3 rounded-lg mb-2 border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-semibold text-gray-700">Level {index + 1}</span>
                                  {rubricLevels.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeRubricLevel(index)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={level.name}
                                  onChange={(e) => updateRubricLevel(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500"
                                  placeholder="Level name (e.g., Excellent, Good)"
                                  required
                                />
                                <textarea
                                  value={level.description}
                                  onChange={(e) => updateRubricLevel(index, 'description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500"
                                  placeholder="Description"
                                  rows={2}
                                  required
                                />
                                <input
                                  type="number"
                                  value={level.percentage}
                                  onChange={(e) => updateRubricLevel(index, 'percentage', Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Percentage (0-100)"
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  required
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                              Add Rubric
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedQuestionForRubric(null);
                                setRubricCriteriaName('');
                                setRubricLevels([{ name: '', description: '', percentage: 0 }]);
                              }}
                              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="space-y-3">
                        {rubrics[question._id]?.map((rubric) => (
                          <div
                            key={rubric._id}
                            className="bg-gray-50 p-4 rounded-lg"
                          >
                            <h5 className="font-bold text-gray-800 mb-2">{rubric.criteriaName}</h5>
                            <div className="space-y-2">
                              {rubric.levels.map((level, idx) => (
                                <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800">{level.name}</p>
                                      <p className="text-sm text-gray-600">{level.description}</p>
                                    </div>
                                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold ml-2">
                                      {level.percentage}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {(!rubrics[question._id] || rubrics[question._id].length === 0) && (
                          <p className="text-gray-500 text-sm">No rubrics yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No questions yet. Add your first question to get started!
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'submissions' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Submissions</h2>
                <button
                  onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  {showSubmissionForm ? 'Cancel' : '+ Add Submission'}
                </button>
              </div>

              {showSubmissionForm && (
                <form onSubmit={createSubmission} className="mb-8 p-6 bg-gray-50 rounded-xl">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student Name
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student Email
                    </label>
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Answers</h3>
                    {questions.map((question) => (
                      <div key={question._id} className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Question {question.questionNumber}: {question.questionText}
                        </label>
                        <textarea
                          value={answers[question._id] || ''}
                          onChange={(e) =>
                            setAnswers({ ...answers, [question._id]: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          rows={3}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Submit
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission._id}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{submission.studentName}</h3>
                        <p className="text-gray-600">{submission.studentEmail}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <Link
                        href={`/grade/${submission._id}`}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Grade
                      </Link>
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No submissions yet. Add a submission to get started!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
