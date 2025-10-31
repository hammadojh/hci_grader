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
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [pointsPercentage, setPointsPercentage] = useState(0);

  // Rubric form state
  const [selectedQuestionForRubric, setSelectedQuestionForRubric] = useState<string | null>(null);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [rubrics, setRubrics] = useState<{ [questionId: string]: Rubric[] }>({});
  const [rubricCriteriaName, setRubricCriteriaName] = useState('');
  const [rubricLevels, setRubricLevels] = useState<RubricLevel[]>([
    { name: '', description: '', percentage: 0 },
  ]);

  // AI Rubric Helper state
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [numberOfLevels, setNumberOfLevels] = useState(4);
  const [aiGeneratedRubrics, setAiGeneratedRubrics] = useState<Array<{
    _id?: string;
    criteriaName: string;
    description?: string;
    levels: RubricLevel[];
  }>>([]);
  const [aiExplanation, setAiExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [aiError, setAiError] = useState('');

  // Submission form state
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});

  // Track which questions have rubrics expanded
  const [expandedRubrics, setExpandedRubrics] = useState<{ [questionId: string]: boolean }>({});

  useEffect(() => {
    fetchAssignment();
    fetchQuestions();
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const startEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.questionText);
    setPointsPercentage(question.pointsPercentage);
    setShowQuestionForm(true);
  };

  const cancelQuestionEdit = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setPointsPercentage(0);
    setShowQuestionForm(false);
  };

  const createOrUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingQuestion) {
      // Update existing question
      await fetch(`/api/questions/${editingQuestion._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          pointsPercentage,
        }),
      });
    } else {
      // Create new question
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
    }

    cancelQuestionEdit();
    fetchQuestions();
  };

  const deleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question? This will also delete all associated rubrics.')) {
      await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      fetchQuestions();
    }
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

  const startEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setSelectedQuestionForRubric(rubric.questionId);
    setRubricCriteriaName(rubric.criteriaName);
    setRubricLevels(rubric.levels);
  };

  const cancelRubricEdit = () => {
    setEditingRubric(null);
    setSelectedQuestionForRubric(null);
    setRubricCriteriaName('');
    setRubricLevels([{ name: '', description: '', percentage: 0 }]);
  };

  const createOrUpdateRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionForRubric) return;

    if (editingRubric) {
      // Update existing rubric
      await fetch(`/api/rubrics/${editingRubric._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteriaName: rubricCriteriaName,
          levels: rubricLevels,
        }),
      });
    } else {
      // Create new rubric
      await fetch('/api/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: selectedQuestionForRubric,
          criteriaName: rubricCriteriaName,
          levels: rubricLevels,
        }),
      });
    }

    fetchRubrics(selectedQuestionForRubric);
    cancelRubricEdit();
  };

  const deleteRubric = async (rubricId: string, questionId: string) => {
    if (confirm('Are you sure you want to delete this rubric?')) {
      await fetch(`/api/rubrics/${rubricId}`, { method: 'DELETE' });
      fetchRubrics(questionId);
    }
  };

  // AI Rubric Helper functions
  const openAIHelper = (questionId: string) => {
    setSelectedQuestionForRubric(questionId);
    setShowAIHelper(true);
    setAiPrompt('');
    setConversationHistory([]);
    setAiError('');
    
    // Load existing rubrics if available
    const existingRubrics = rubrics[questionId] || [];
    if (existingRubrics.length > 0) {
      // Pre-populate with existing rubrics (keep _id for updating)
      setAiGeneratedRubrics(existingRubrics.map(rubric => ({
        _id: rubric._id,
        criteriaName: rubric.criteriaName,
        levels: [...rubric.levels]
      })));
      setAiExplanation('Loaded existing rubrics. You can edit them below or ask AI to refine them.');
    } else {
      // Start fresh
      setAiGeneratedRubrics([]);
      setAiExplanation('');
    }
  };

  const closeAIHelper = () => {
    setShowAIHelper(false);
    setAiPrompt('');
    setAiGeneratedRubrics([]);
    setAiExplanation('');
    setConversationHistory([]);
    setAiError('');
    setSelectedQuestionForRubric(null);
  };

  const generateAIRubrics = async (isFollowUp: boolean = false) => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setAiError('');

    try {
      // Prepare the request payload
      const payload: any = {
        userPrompt: aiPrompt,
        numberOfLevels: isFollowUp ? undefined : numberOfLevels,
        conversationHistory: isFollowUp ? conversationHistory : undefined,
      };

      // Include current rubrics as context for refinement (both follow-up and initial if rubrics exist)
      if (aiGeneratedRubrics.length > 0) {
        payload.currentRubrics = aiGeneratedRubrics.map(rubric => ({
          criteriaName: rubric.criteriaName,
          levels: rubric.levels
        }));
      }

      const response = await fetch('/api/ai-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setAiError(data.error || 'Failed to generate rubrics');
        return;
      }

      // When refining existing rubrics, preserve their IDs
      const updatedRubrics = data.rubrics || [];
      if (isFollowUp && aiGeneratedRubrics.length > 0) {
        // Map new rubrics to existing ones by criteria name to preserve IDs
        const rubricsWithIds = updatedRubrics.map((newRubric: any, index: number) => {
          // Try to find matching existing rubric by criteria name
          const existingRubric = aiGeneratedRubrics.find(
            r => r.criteriaName.toLowerCase() === newRubric.criteriaName.toLowerCase()
          );
          return {
            ...newRubric,
            _id: existingRubric?._id || aiGeneratedRubrics[index]?._id
          };
        });
        setAiGeneratedRubrics(rubricsWithIds);
      } else {
        setAiGeneratedRubrics(updatedRubrics);
      }

      setAiExplanation(data.explanation || '');
      setConversationHistory(data.conversationHistory || []);
      setAiPrompt('');
    } catch (error) {
      console.error('AI generation error:', error);
      setAiError('Failed to generate rubrics. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const editAIRubric = (index: number, field: string, value: string | number, levelIndex?: number) => {
    const updated = [...aiGeneratedRubrics];
    if (levelIndex !== undefined) {
      // Editing a level field
      const level = updated[index].levels[levelIndex];
      if (field === 'name' || field === 'description') {
        level[field] = value as string;
      } else if (field === 'percentage') {
        level[field] = value as number;
      }
    } else {
      // Editing a rubric field
      if (field === 'criteriaName') {
        updated[index].criteriaName = value as string;
      } else if (field === 'description') {
        updated[index].description = value as string;
      }
    }
    setAiGeneratedRubrics(updated);
  };

  const removeAIRubric = (index: number) => {
    setAiGeneratedRubrics(aiGeneratedRubrics.filter((_, i) => i !== index));
  };

  const approveAIRubrics = async () => {
    if (!selectedQuestionForRubric || aiGeneratedRubrics.length === 0) return;

    try {
      // Update or create rubrics based on whether they have an _id
      for (const rubric of aiGeneratedRubrics) {
        if (rubric._id) {
          // Update existing rubric
          await fetch(`/api/rubrics/${rubric._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              criteriaName: rubric.criteriaName,
              levels: rubric.levels,
            }),
          });
        } else {
          // Create new rubric
          await fetch('/api/rubrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: selectedQuestionForRubric,
              criteriaName: rubric.criteriaName,
              levels: rubric.levels,
            }),
          });
        }
      }

      // Refresh rubrics and close AI helper
      fetchRubrics(selectedQuestionForRubric);
      closeAIHelper();
    } catch (error) {
      console.error('Failed to approve rubrics:', error);
      setAiError('Failed to save rubrics. Please try again.');
    }
  };

  const createSubmission = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const toggleRubrics = (questionId: string) => {
    setExpandedRubrics((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/" className="text-indigo-600 hover:text-indigo-700 mb-2 inline-block font-semibold">
                ← Back to Assignments
              </Link>
              <h1 className="text-4xl font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-gray-600 mt-2">{assignment.description}</p>
              <p className="text-indigo-600 font-semibold mt-2">Total Points: {assignment.totalPoints}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/settings"
                className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                ⚙️ Settings
              </Link>
              <button
                onClick={exportCSV}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-3 font-semibold transition-colors ${activeTab === 'questions'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Questions & Rubrics
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-3 font-semibold transition-colors ${activeTab === 'submissions'
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
                  <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Total Percentage: {getTotalPercentage()}% {getTotalPercentage() !== 100 && (
                      <span className="text-amber-600 font-semibold">(Should be 100%)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (showQuestionForm && !editingQuestion) {
                      cancelQuestionEdit();
                    } else {
                      setShowQuestionForm(!showQuestionForm);
                      setEditingQuestion(null);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  {showQuestionForm && !editingQuestion ? 'Cancel' : '+ Add Question'}
                </button>
              </div>

              {showQuestionForm && (
                <form onSubmit={createOrUpdateQuestion} className="mb-6 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingQuestion ? 'Edit Question' : 'Add New Question'}
                  </h3>
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
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {editingQuestion ? 'Update Question' : 'Add Question'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelQuestionEdit}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question._id} className="border border-gray-200 rounded-lg p-6 hover:border-indigo-200 transition-colors">
                    <div className="mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Question {question.questionNumber}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditQuestion(question)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteQuestion(question._id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-2">{question.questionText}</p>
                      <p className="text-sm text-indigo-600 font-semibold">
                        {question.pointsPercentage}% ({((question.pointsPercentage / 100) * assignment.totalPoints).toFixed(2)} points)
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <button
                          onClick={() => toggleRubrics(question._id)}
                          className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                        >
                          <span className="text-lg">
                            {expandedRubrics[question._id] ? '▼' : '▶'}
                          </span>
                          <span>Rubrics ({rubrics[question._id]?.length || 0})</span>
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openAIHelper(question._id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded-lg text-sm font-semibold transition-colors"
                          >
                            ✨ AI Helper
                          </button>
                          <button
                            onClick={() => {
                              setSelectedQuestionForRubric(question._id);
                              setEditingRubric(null);
                              setRubricCriteriaName('');
                              setRubricLevels([{ name: '', description: '', percentage: 0 }]);
                              // Auto-expand when adding a rubric
                              setExpandedRubrics((prev) => ({ ...prev, [question._id]: true }));
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-sm font-semibold transition-colors"
                          >
                            + Add Rubric
                          </button>
                        </div>
                      </div>

                      {expandedRubrics[question._id] && (selectedQuestionForRubric === question._id || editingRubric?.questionId === question._id) && (
                        <form onSubmit={createOrUpdateRubric} className="mb-6 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                          <h4 className="font-semibold text-gray-800 mb-3">
                            {editingRubric ? 'Edit Rubric' : 'Add New Rubric'}
                          </h4>
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Criteria Name
                            </label>
                              <input
                              type="text"
                              value={rubricCriteriaName}
                              onChange={(e) => setRubricCriteriaName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Level name (e.g., Excellent, Good)"
                                  required
                                />
                                <textarea
                                  value={level.description}
                                  onChange={(e) => updateRubricLevel(index, 'description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Description"
                                  rows={2}
                                  required
                                />
                                <input
                                  type="number"
                                  value={level.percentage}
                                  onChange={(e) => updateRubricLevel(index, 'percentage', Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                              {editingRubric ? 'Update Rubric' : 'Add Rubric'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelRubricEdit}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {expandedRubrics[question._id] && (
                        <div className="space-y-3">
                        {rubrics[question._id]?.map((rubric) => (
                          <div
                            key={rubric._id}
                            className="bg-gray-50 p-4 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-gray-800">{rubric.criteriaName}</h5>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditRubric(rubric)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold transition-colors"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => deleteRubric(rubric._id!, question._id)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold transition-colors"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
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
                      )}
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
                <h2 className="text-2xl font-bold text-gray-900">Submissions & Grading</h2>
                <div className="flex gap-3">
                  {questions.length > 0 && submissions.length > 0 && (
                    <Link
                      href={`/grade-by-question/${assignmentId}/${questions[0]._id}`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      📝 Grade by Question
                    </Link>
                  )}
                  <button
                    onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {showSubmissionForm ? 'Cancel' : '+ Add Submission'}
                  </button>
                </div>
              </div>

              {showSubmissionForm && (
                <form onSubmit={createSubmission} className="mb-6 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Submit
                  </button>
                </form>
              )}

              <div className="space-y-6">
                {submissions.map((submission) => (
                  <div
                    key={submission._id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-indigo-300 transition-all"
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
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

        {/* AI Rubric Helper Modal */}
        {showAIHelper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">✨ AI Rubric Helper</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Describe the criteria you want to assess and let AI suggest comprehensive rubrics
                    </p>
                  </div>
                  <button
                    onClick={closeAIHelper}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Initial Prompt Section - Show when no rubrics OR when showing existing rubrics */}
                {aiGeneratedRubrics.length === 0 && (
                  <div className="mb-6">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        What criteria do you want to assess?
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={4}
                        placeholder="Example: I want to assess students' understanding of UX design principles, including their ability to identify usability issues, propose solutions, and justify their design decisions."
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number of Performance Levels
                      </label>
                      <select
                        value={numberOfLevels}
                        onChange={(e) => setNumberOfLevels(Number(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value={2}>2 Levels</option>
                        <option value={3}>3 Levels</option>
                        <option value={4}>4 Levels</option>
                        <option value={5}>5 Levels</option>
                      </select>
                    </div>

                    <button
                      onClick={() => generateAIRubrics(false)}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      {isGenerating ? 'Generating...' : '🚀 Generate Rubrics'}
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {aiError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{aiError}</p>
                    {aiError.includes('API key') && (
                      <Link
                        href="/settings"
                        className="text-red-600 hover:text-red-800 text-sm underline mt-2 inline-block"
                      >
                        Go to Settings
                      </Link>
                    )}
                  </div>
                )}

                {/* AI Generated Rubrics */}
                {aiGeneratedRubrics.length > 0 && (
                  <div>
                    {/* AI Explanation or Status */}
                    {aiExplanation && (
                      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h3 className="font-semibold text-purple-900 mb-2">
                          {aiExplanation.includes('Loaded existing') ? '📋 Current Rubrics' : '✨ AI Recommendations'}
                        </h3>
                        <p className="text-purple-800 text-sm">{aiExplanation}</p>
                      </div>
                    )}

                    {/* Editable Rubrics */}
                    <div className="space-y-6 mb-6">
                      {aiGeneratedRubrics.map((rubric, rubricIndex) => (
                        <div key={rubricIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Criteria Name
                              </label>
                              <input
                                type="text"
                                value={rubric.criteriaName}
                                onChange={(e) => editAIRubric(rubricIndex, 'criteriaName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              />
                              {rubric.description && (
                                <p className="text-sm text-gray-600 mt-2">{rubric.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeAIRubric(rubricIndex)}
                              className="ml-4 text-red-600 hover:text-red-800 font-semibold text-sm"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">
                              Performance Levels
                            </label>
                            {rubric.levels.map((level: RubricLevel, levelIndex: number) => (
                              <div key={levelIndex} className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Level Name
                                    </label>
                                    <input
                                      type="text"
                                      value={level.name}
                                      onChange={(e) => editAIRubric(rubricIndex, 'name', e.target.value, levelIndex)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Percentage (0-100)
                                    </label>
                                    <input
                                      type="number"
                                      value={level.percentage}
                                      onChange={(e) => editAIRubric(rubricIndex, 'percentage', Number(e.target.value), levelIndex)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                                      min={0}
                                      max={100}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    value={level.description}
                                    onChange={(e) => editAIRubric(rubricIndex, 'description', e.target.value, levelIndex)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                                    rows={2}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Follow-up Prompt / Refinement Section */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {aiExplanation.includes('Loaded existing') 
                          ? 'Ask AI to refine these rubrics' 
                          : 'Need changes? Ask AI to refine the rubrics'}
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                        rows={3}
                        placeholder="Example: Make the descriptions more specific, add a criterion for code quality, increase the weight for correctness, make level descriptions more detailed..."
                      />
                      <button
                        onClick={() => generateAIRubrics(true)}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                      >
                        {isGenerating ? 'Refining...' : '🔄 Refine with AI'}
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={closeAIHelper}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={approveAIRubrics}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        {aiGeneratedRubrics.some(r => r._id) ? '✓ Save Changes' : '✓ Approve & Add Rubrics'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
