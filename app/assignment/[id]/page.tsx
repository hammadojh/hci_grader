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

interface SubmissionStats {
  submissionId: string;
  gradedCount: number;
  totalCount: number;
}

export default function AssignmentDetail() {
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'submissions'>('questions');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats[]>([]);

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

  // PDF Upload state
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Array<{
    questionText: string;
    questionNumber: number;
    pointsPercentage: number;
    rubrics: Array<{
      criteriaName: string;
      levels: RubricLevel[];
    }>;
  }>>([]);
  const [extractionSummary, setExtractionSummary] = useState('');
  const [extractionError, setExtractionError] = useState('');
  
  // Extraction options state
  const [extractRubrics, setExtractRubrics] = useState(true);
  const [splitIntoQuestions, setSplitIntoQuestions] = useState(true);
  const [customContext, setCustomContext] = useState('');

  // Submission form state
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});

  // Upload submission state
  const [submissionUploadMode, setSubmissionUploadMode] = useState<'manual' | 'upload'>('manual');
  const [submissionInputMode, setSubmissionInputMode] = useState<'file' | 'text' | 'markdown'>('file');
  const [selectedSubmissionFile, setSelectedSubmissionFile] = useState<File | null>(null);
  const [pastedSubmissionText, setPastedSubmissionText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedAnswers, setParsedAnswers] = useState<Array<{
    questionId: string;
    questionNumber: number;
    questionText: string;
    answerText: string;
    confidence: string;
  }>>([]);
  const [parseSummary, setParseSummary] = useState('');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [extractedTextPreview, setExtractedTextPreview] = useState('');

  // Track which questions have rubrics expanded
  const [expandedRubrics, setExpandedRubrics] = useState<{ [questionId: string]: boolean }>({});

  // Batch upload state
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [selectedBatchFiles, setSelectedBatchFiles] = useState<File[]>([]);
  const [batchUploadId, setBatchUploadId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchPollingInterval, setBatchPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAssignment();
    fetchQuestions();
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  useEffect(() => {
    questions.forEach((q) => fetchRubrics(q._id));
  }, [questions]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (batchPollingInterval) {
        clearInterval(batchPollingInterval);
      }
    };
  }, [batchPollingInterval]);

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
    
    // Fetch stats for each submission
    await fetchSubmissionStats(data);
  };

  const fetchSubmissionStats = async (submissionsList: Submission[]) => {
    const stats: SubmissionStats[] = [];
    
    for (const submission of submissionsList) {
      try {
        const answersRes = await fetch(`/api/answers?submissionId=${submission._id}`);
        const answers = await answersRes.json();
        
        // Count graded answers (those with criteriaEvaluations that have been filled out)
        // An answer is considered "graded" only if it has at least one criteria evaluation
        const gradedCount = answers.filter((answer: any) => 
          answer.criteriaEvaluations && answer.criteriaEvaluations.length > 0
        ).length;
        
        stats.push({
          submissionId: submission._id,
          gradedCount,
          totalCount: answers.length,
        });
      } catch (error) {
        console.error(`Failed to fetch stats for submission ${submission._id}:`, error);
        stats.push({
          submissionId: submission._id,
          gradedCount: 0,
          totalCount: 0,
        });
      }
    }
    
    setSubmissionStats(stats);
  };

  const getSubmissionStat = (submissionId: string) => {
    return submissionStats.find(s => s.submissionId === submissionId) || { gradedCount: 0, totalCount: 0 };
  };

  const getOverallStats = () => {
    const totalStudents = submissions.length;
    const totalQuestions = questions.length * submissions.length;
    const totalGraded = submissionStats.reduce((sum, stat) => sum + stat.gradedCount, 0);
    const progress = totalQuestions > 0 ? Math.round((totalGraded / totalQuestions) * 100) : 0;
    
    return { totalStudents, totalGraded, totalQuestions, progress };
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

  // Handle file selection for submission upload
  const handleSubmissionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValid = file.type === 'application/pdf' ||
                     file.type.startsWith('image/') ||
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.markdown') ||
                     file.type.startsWith('text/');
      if (isValid) {
        setSelectedSubmissionFile(file);
        setParseError('');
      } else {
        setParseError('Please select a valid file (PDF, image, markdown, or text file)');
        setSelectedSubmissionFile(null);
      }
    }
  };

  // Parse uploaded submission
  const parseSubmission = async () => {
    if (submissionInputMode === 'file' && !selectedSubmissionFile) {
      setParseError('Please select a file to upload');
      return;
    }
    if ((submissionInputMode === 'text' || submissionInputMode === 'markdown') && !pastedSubmissionText.trim()) {
      setParseError('Please enter some text');
      return;
    }

    setIsParsing(true);
    setParseError('');
    setParsedAnswers([]);

    try {
      let response;

      if (submissionInputMode === 'file') {
        // Send file as FormData
        const formData = new FormData();
        formData.append('file', selectedSubmissionFile!);
        formData.append('assignmentId', assignmentId);

        response = await fetch('/api/parse-submission', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Send text/markdown as JSON
        response = await fetch('/api/parse-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pastedSubmissionText,
            assignmentId,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setParseError(data.error || 'Failed to parse submission');
        return;
      }

      setParsedAnswers(data.answers || []);
      setParseSummary(data.summary || 'Submission parsed successfully');
      setParseWarnings(data.warnings || []);
      setExtractedTextPreview(data.extractedText || '');

      // Populate answers state with parsed answers
      const answersObj: { [questionId: string]: string } = {};
      data.answers?.forEach((answer: any) => {
        answersObj[answer.questionId] = answer.answerText;
      });
      setAnswers(answersObj);

    } catch (error) {
      console.error('Parse error:', error);
      setParseError('Failed to parse submission. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setSubmissionUploadMode('manual');
    setSubmissionInputMode('file');
    setSelectedSubmissionFile(null);
    setPastedSubmissionText('');
    setParsedAnswers([]);
    setParseSummary('');
    setParseWarnings([]);
    setParseError('');
    setExtractedTextPreview('');
  };

  // Start editing a submission
  const startEditSubmission = async (submission: Submission) => {
    setEditingSubmission(submission);
    setStudentName(submission.studentName);
    setStudentEmail(submission.studentEmail);
    setShowSubmissionForm(true);
    resetUploadForm();
    
    // Fetch existing answers for this submission
    const answersRes = await fetch(`/api/answers?submissionId=${submission._id}`);
    const existingAnswers = await answersRes.json();
    
    const answersObj: { [questionId: string]: string } = {};
    existingAnswers.forEach((answer: any) => {
      answersObj[answer.questionId] = answer.answerText;
    });
    setAnswers(answersObj);
  };

  // Cancel editing
  const cancelSubmissionEdit = () => {
    setEditingSubmission(null);
    setStudentName('');
    setStudentEmail('');
    setAnswers({});
    setShowSubmissionForm(false);
    resetUploadForm();
  };

  // Delete submission
  const deleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission? This will also delete all associated answers and cannot be undone.')) {
      return;
    }

    try {
      // Delete the submission (API will cascade delete all associated answers)
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchSubmissions();
      } else {
        const error = await res.json();
        alert(`Failed to delete submission: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete submission');
    }
  };

  const createOrUpdateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSubmission) {
      // Update existing submission
      await fetch('/api/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: editingSubmission._id,
          studentName,
          studentEmail,
        }),
      });

      // Update answers
      for (const question of questions) {
        const existingAnswerRes = await fetch(`/api/answers?submissionId=${editingSubmission._id}&questionId=${question._id}`);
        const existingAnswers = await existingAnswerRes.json();

        if (existingAnswers.length > 0) {
          // Update existing answer
          await fetch('/api/answers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: existingAnswers[0]._id,
              answerText: answers[question._id] || '',
            }),
          });
        } else {
          // Create new answer if it doesn't exist
          await fetch('/api/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionId: editingSubmission._id,
              questionId: question._id,
              answerText: answers[question._id] || '',
            }),
          });
        }
      }
    } else {
      // Create new submission
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
    }

    setEditingSubmission(null);
    setStudentName('');
    setStudentEmail('');
    setAnswers({});
    setShowSubmissionForm(false);
    resetUploadForm();
    fetchSubmissions();
  };

  const exportCSV = () => {
    window.open(`/api/export?assignmentId=${assignmentId}`, '_blank');
  };

  // Batch upload functions
  const openBatchUpload = () => {
    setShowBatchUpload(true);
    setSelectedBatchFiles([]);
    setBatchUploadId(null);
    setBatchStatus(null);
    setIsProcessingBatch(false);
  };

  const closeBatchUpload = () => {
    // Force stop polling first
    if (batchPollingInterval) {
      clearInterval(batchPollingInterval);
      setBatchPollingInterval(null);
    }
    
    // Reset all state
    setShowBatchUpload(false);
    setSelectedBatchFiles([]);
    setBatchUploadId(null);
    setBatchStatus(null);
    setIsProcessingBatch(false);
    
    // Refresh submissions list
    fetchSubmissions();
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValid = file.type === 'application/pdf' ||
                     file.type.startsWith('image/') ||
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.markdown') ||
                     file.type.startsWith('text/');
      return isValid;
    });
    setSelectedBatchFiles(validFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const isValid = file.type === 'application/pdf' ||
                     file.type.startsWith('image/') ||
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.markdown') ||
                     file.type.startsWith('text/');
      return isValid;
    });
    setSelectedBatchFiles(prev => [...prev, ...validFiles]);
  };

  const removeBatchFile = (index: number) => {
    setSelectedBatchFiles(prev => prev.filter((_, i) => i !== index));
  };

  const pollBatchStatus = async (batchId: string) => {
    try {
      const res = await fetch(`/api/batch-upload?batchId=${batchId}`);
      const data = await res.json();
      setBatchStatus(data);
      
      // If batch is completed or failed, stop polling
      if (data.status === 'completed' || data.status === 'partial' || data.status === 'failed') {
        if (batchPollingInterval) {
          clearInterval(batchPollingInterval);
          setBatchPollingInterval(null);
        }
        setIsProcessingBatch(false);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const startBatchUpload = async () => {
    if (selectedBatchFiles.length === 0) return;
    
    setIsProcessingBatch(true);
    
    try {
      // Step 1: Initialize batch upload
      const initRes = await fetch('/api/batch-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          files: selectedBatchFiles.map(f => ({
            name: f.name,
            size: f.size,
          })),
        }),
      });
      
      const initData = await initRes.json();
      const newBatchId = initData.batchId;
      setBatchUploadId(newBatchId);
      
      // Step 2: Start polling for status
      const interval = setInterval(() => pollBatchStatus(newBatchId), 2000);
      setBatchPollingInterval(interval);
      
      // Step 3: Process each file in the background
      selectedBatchFiles.forEach((file, index) => {
        processFileAsync(file, newBatchId, index);
      });
      
    } catch (error) {
      console.error('Batch upload error:', error);
      setIsProcessingBatch(false);
      alert('Failed to start batch upload');
    }
  };

  const processFileAsync = async (file: File, batchId: string, fileIndex: number) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('batchId', batchId);
      formData.append('fileIndex', fileIndex.toString());
      formData.append('assignmentId', assignmentId);
      
      await fetch('/api/batch-upload/process-file', {
        method: 'POST',
        body: formData,
      });
      
      // Poll immediately after completion
      await pollBatchStatus(batchId);
      
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStepText = (step?: string) => {
    switch (step) {
      case 'extracting_text': return 'Extracting text...';
      case 'extracting_metadata': return 'Extracting name & email...';
      case 'parsing_answers': return 'Parsing answers...';
      case 'creating_submission': return 'Creating submission...';
      default: return 'Waiting...';
    }
  };

  const toggleRubrics = (questionId: string) => {
    setExpandedRubrics((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // PDF Upload functions
  const openPDFUpload = () => {
    setShowPDFUpload(true);
    setUploadMode('file');
    setSelectedFile(null);
    setPastedText('');
    setExtractedQuestions([]);
    setExtractionSummary('');
    setExtractionError('');
  };

  const closePDFUpload = () => {
    setShowPDFUpload(false);
    setUploadMode('file');
    setSelectedFile(null);
    setPastedText('');
    setExtractedQuestions([]);
    setExtractionSummary('');
    setExtractionError('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValid = file.type === 'application/pdf' || 
                     file.name.endsWith('.md') || 
                     file.name.endsWith('.markdown');
      if (isValid) {
        setSelectedFile(file);
        setExtractionError('');
      } else {
        setExtractionError('Please select a valid PDF or Markdown (.md) file');
        setSelectedFile(null);
      }
    }
  };

  const extractFromInput = async () => {
    if (uploadMode === 'file' && !selectedFile) return;
    if (uploadMode === 'text' && !pastedText.trim()) {
      setExtractionError('Please enter some text');
      return;
    }

    setIsExtracting(true);
    setExtractionError('');

    try {
      let response;

      if (uploadMode === 'text') {
        // Send pasted text as JSON
        response = await fetch('/api/extract-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: pastedText,
            extractRubrics,
            splitIntoQuestions,
            customContext,
          }),
        });
      } else {
        // Send file as FormData
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('extractRubrics', extractRubrics.toString());
        formData.append('splitIntoQuestions', splitIntoQuestions.toString());
        formData.append('customContext', customContext);

        response = await fetch('/api/extract-exam', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setExtractionError(data.error || 'Failed to extract exam data');
        return;
      }

      setExtractedQuestions(data.questions || []);
      setExtractionSummary(data.summary || 'Exam extracted successfully');
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError('Failed to extract exam data. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const editExtractedQuestion = (index: number, field: string, value: string | number) => {
    const updated = [...extractedQuestions];
    if (field === 'questionText') {
      updated[index].questionText = value as string;
    } else if (field === 'pointsPercentage') {
      updated[index].pointsPercentage = value as number;
    }
    setExtractedQuestions(updated);
  };

  const editExtractedRubric = (
    questionIndex: number,
    rubricIndex: number,
    field: string,
    value: string | number,
    levelIndex?: number
  ) => {
    const updated = [...extractedQuestions];
    const rubric = updated[questionIndex].rubrics[rubricIndex];

    if (levelIndex !== undefined) {
      // Editing a level field
      const level = rubric.levels[levelIndex];
      if (field === 'name' || field === 'description') {
        level[field] = value as string;
      } else if (field === 'percentage') {
        level.percentage = value as number;
      }
    } else {
      // Editing rubric criteria name
      if (field === 'criteriaName') {
        rubric.criteriaName = value as string;
      }
    }
    setExtractedQuestions(updated);
  };

  const removeExtractedQuestion = (index: number) => {
    setExtractedQuestions(extractedQuestions.filter((_, i) => i !== index));
  };

  const removeExtractedRubric = (questionIndex: number, rubricIndex: number) => {
    const updated = [...extractedQuestions];
    updated[questionIndex].rubrics = updated[questionIndex].rubrics.filter((_, i) => i !== rubricIndex);
    setExtractedQuestions(updated);
  };

  const approveExtractedData = async () => {
    if (extractedQuestions.length === 0) return;

    try {
      // Create all questions first
      for (const extractedQ of extractedQuestions) {
        const questionRes = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId,
            questionText: extractedQ.questionText,
            questionNumber: extractedQ.questionNumber,
            pointsPercentage: extractedQ.pointsPercentage,
          }),
        });

        const createdQuestion = await questionRes.json();

        // Create rubrics for this question
        for (const rubric of extractedQ.rubrics) {
          await fetch('/api/rubrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: createdQuestion._id,
              criteriaName: rubric.criteriaName,
              levels: rubric.levels,
            }),
          });
        }
      }

      // Refresh questions and close modal
      await fetchQuestions();
      closePDFUpload();
    } catch (error) {
      console.error('Failed to save extracted data:', error);
      setExtractionError('Failed to save questions and rubrics. Please try again.');
    }
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
                <div className="flex gap-2">
                  <button
                    onClick={openPDFUpload}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    📄 Upload Exam using AI
                  </button>
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
              {/* Stats Section */}
              {submissions.length > 0 && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Total Students */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-600">Total Students</p>
                        <p className="text-3xl font-bold text-blue-900 mt-1">{getOverallStats().totalStudents}</p>
                      </div>
                      <div className="text-4xl">👥</div>
                    </div>
                  </div>

                  {/* Total Answers */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-600">Total Answers</p>
                        <p className="text-3xl font-bold text-purple-900 mt-1">{getOverallStats().totalQuestions}</p>
                      </div>
                      <div className="text-4xl">📝</div>
                    </div>
                  </div>

                  {/* Graded Answers */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-600">Graded Answers</p>
                        <p className="text-3xl font-bold text-green-900 mt-1">
                          {getOverallStats().totalGraded}
                          <span className="text-lg text-green-700">/{getOverallStats().totalQuestions}</span>
                        </p>
                      </div>
                      <div className="text-4xl">✅</div>
                    </div>
                  </div>

                  {/* Overall Progress */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-indigo-600">Overall Progress</p>
                        <p className="text-3xl font-bold text-indigo-900 mt-1">{getOverallStats().progress}%</p>
                      </div>
                      <div className="text-4xl">📊</div>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getOverallStats().progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

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
                    onClick={openBatchUpload}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    📦 Batch Upload
                  </button>
                  <button
                    onClick={() => {
                      if (showSubmissionForm) {
                        cancelSubmissionEdit();
                      } else {
                        setShowSubmissionForm(true);
                        setEditingSubmission(null);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {showSubmissionForm ? 'Cancel' : '+ Add Submission'}
                  </button>
                </div>
              </div>

              {showSubmissionForm && (
                <form onSubmit={createOrUpdateSubmission} className="mb-6 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {editingSubmission ? '✏️ Edit Submission' : '➕ Add New Submission'}
                  </h3>
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
                      Student Email / ID
                    </label>
                    <input
                      type="text"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="email@example.com or G202421408"
                      required
                    />
                  </div>

                  {/* Answer Input Mode Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      How would you like to add answers?
                    </label>
                    <div className="flex gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmissionUploadMode('manual');
                          resetUploadForm();
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                          submissionUploadMode === 'manual'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        ✏️ Type Manually
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionUploadMode('upload')}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                          submissionUploadMode === 'upload'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        📤 Upload / Paste (AI Parsing)
                      </button>
                    </div>

                    {/* Upload Mode UI */}
                    {submissionUploadMode === 'upload' && (
                      <div className="bg-white p-4 rounded-lg border border-indigo-200 mb-4">
                        <div className="flex border-b border-gray-200 mb-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSubmissionInputMode('file');
                              setPastedSubmissionText('');
                              setParseError('');
                            }}
                            className={`px-4 py-2 font-semibold transition-colors ${
                              submissionInputMode === 'file'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            📁 Upload File
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmissionInputMode('text');
                              setSelectedSubmissionFile(null);
                              setParseError('');
                            }}
                            className={`px-4 py-2 font-semibold transition-colors ${
                              submissionInputMode === 'text'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            📝 Paste Text
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmissionInputMode('markdown');
                              setSelectedSubmissionFile(null);
                              setParseError('');
                            }}
                            className={`px-4 py-2 font-semibold transition-colors ${
                              submissionInputMode === 'markdown'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            📋 Paste Markdown
                          </button>
                        </div>

                        {/* File Upload */}
                        {submissionInputMode === 'file' && (
                  <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Select File (PDF, Image, Markdown, or Text)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                              <input
                                type="file"
                                accept="application/pdf,image/*,.md,.markdown,text/*"
                                onChange={handleSubmissionFileSelect}
                                className="hidden"
                                id="submission-file-upload"
                              />
                              <label htmlFor="submission-file-upload" className="cursor-pointer">
                                <div className="text-4xl mb-2">
                                  {selectedSubmissionFile?.type.startsWith('image/') ? '🖼️' : '📄'}
                                </div>
                                <p className="text-gray-700 font-semibold mb-1">
                                  {selectedSubmissionFile ? selectedSubmissionFile.name : 'Click to select a file'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  PDF, images (with OCR), markdown, or text files
                                </p>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Text Paste */}
                        {submissionInputMode === 'text' && (
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Paste Student's Answers
                            </label>
                            <textarea
                              value={pastedSubmissionText}
                              onChange={(e) => setPastedSubmissionText(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                              rows={10}
                              placeholder="Paste the student's submission text here...

Example:
Question 1: UX design focuses on user experience...
Question 2: The design thinking process includes empathize, define, ideate..."
                            />
                          </div>
                        )}

                        {/* Markdown Paste */}
                        {submissionInputMode === 'markdown' && (
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Paste Markdown Content
                            </label>
                            <textarea
                              value={pastedSubmissionText}
                              onChange={(e) => setPastedSubmissionText(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                              rows={10}
                              placeholder="Paste markdown content here...

# Question 1
Answer here...

# Question 2
Answer here..."
                            />
                          </div>
                        )}

                        {/* Parse Button */}
                        {((submissionInputMode === 'file' && selectedSubmissionFile) ||
                          ((submissionInputMode === 'text' || submissionInputMode === 'markdown') && pastedSubmissionText.trim())) && (
                          <button
                            type="button"
                            onClick={parseSubmission}
                            disabled={isParsing}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full mb-3"
                          >
                            {isParsing ? '🔄 Parsing with AI... This may take a moment' : '🤖 Parse Submission with AI'}
                          </button>
                        )}

                        {/* Parse Error */}
                        {parseError && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800 text-sm">{parseError}</p>
                          </div>
                        )}

                        {/* Parse Summary */}
                        {parseSummary && parsedAnswers.length > 0 && (
                          <div className="mb-3 space-y-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-green-800 text-sm font-semibold">✅ {parseSummary}</p>
                              {parseWarnings.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-yellow-700 text-xs font-semibold">⚠️ Warnings:</p>
                                  <ul className="list-disc list-inside text-yellow-700 text-xs">
                                    {parseWarnings.map((warning, idx) => (
                                      <li key={idx}>{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <p className="text-green-700 text-xs mt-2">
                                Review and edit the parsed answers below before submitting.
                              </p>
                            </div>
                            
                            {/* Extracted Text Preview */}
                            {extractedTextPreview && (
                              <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                                  📄 View Extracted Text (what AI analyzed)
                                </summary>
                                <div className="mt-2 p-3 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap">
                                  {extractedTextPreview}
                                </div>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Answers Section */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-700 mb-3">
                      {submissionUploadMode === 'upload' && parsedAnswers.length > 0 ? 'Review Parsed Answers' : 'Answers'}
                    </h3>
                    {questions.map((question) => (
                      <div key={question._id} className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Question {question.questionNumber}: {question.questionText}
                          {submissionUploadMode === 'upload' && parsedAnswers.length > 0 && (
                            <span className="ml-2 text-xs">
                              {(() => {
                                const parsed = parsedAnswers.find(a => a.questionId === question._id);
                                const confidence = parsed?.confidence || 'low';
                                const color = confidence === 'high' ? 'text-green-600' : confidence === 'medium' ? 'text-yellow-600' : 'text-red-600';
                                return parsed?.answerText ? (
                                  <span className={color}>
                                    ({confidence} confidence)
                                  </span>
                                ) : (
                                  <span className="text-gray-500">(no answer found)</span>
                                );
                              })()}
                            </span>
                          )}
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

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {editingSubmission ? '💾 Update Submission' : '➕ Create Submission'}
                    </button>
                    {editingSubmission && (
                      <button
                        type="button"
                        onClick={cancelSubmissionEdit}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}

              <div className="space-y-6">
                {submissions.map((submission) => {
                  const stats = getSubmissionStat(submission._id);
                  const completionPercentage = stats.totalCount > 0 
                    ? Math.round((stats.gradedCount / stats.totalCount) * 100) 
                    : 0;
                  
                  return (
                  <div
                    key={submission._id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-indigo-300 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{submission.studentName}</h3>
                        <p className="text-gray-600">{submission.studentEmail}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                        
                        {/* Completion Status */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">Completed questions:</span>
                            <span className={`text-sm font-bold ${
                              completionPercentage === 100 ? 'text-green-600' :
                              completionPercentage > 0 ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>
                              {stats.gradedCount} / {stats.totalCount}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="flex-1 max-w-xs">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  completionPercentage === 100 ? 'bg-green-600' :
                                  completionPercentage > 0 ? 'bg-yellow-500' :
                                  'bg-gray-400'
                                }`}
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                          </div>
                          
                          <span className={`text-xs font-semibold ${
                            completionPercentage === 100 ? 'text-green-600' :
                            completionPercentage > 0 ? 'text-yellow-600' :
                            'text-gray-500'
                          }`}>
                            {completionPercentage}%
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditSubmission(submission)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteSubmission(submission._id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          🗑️ Delete
                        </button>
                        <Link
                          href={`/grade/${submission._id}`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          📝 Grade
                        </Link>
                      </div>
                    </div>
                  </div>
                  );
                })}
                {submissions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No submissions yet. Add a submission to get started!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PDF Upload Modal */}
        {showPDFUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">📄 Upload Exam using AI</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Upload a PDF exam and let AI extract questions and rubrics automatically
                    </p>
                  </div>
                  <button
                    onClick={closePDFUpload}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Mode Selection Tabs */}
                {extractedQuestions.length === 0 && (
                  <>
                    <div className="flex border-b border-gray-200 mb-6">
                      <button
                        onClick={() => {
                          setUploadMode('file');
                          setPastedText('');
                          setExtractionError('');
                        }}
                        className={`px-6 py-3 font-semibold transition-colors ${uploadMode === 'file'
                          ? 'border-b-2 border-purple-600 text-purple-600'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        📁 Upload File
                      </button>
                      <button
                        onClick={() => {
                          setUploadMode('text');
                          setSelectedFile(null);
                          setExtractionError('');
                        }}
                        className={`px-6 py-3 font-semibold transition-colors ${uploadMode === 'text'
                          ? 'border-b-2 border-purple-600 text-purple-600'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        📝 Paste Text
                      </button>
                    </div>

                    {/* Extraction Options */}
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">⚙️ Extraction Options</h3>
                      
                      <div className="space-y-3">
                        {/* Split into questions toggle */}
                        <label className="flex items-start cursor-pointer">
                          <input
                            type="checkbox"
                            checked={splitIntoQuestions}
                            onChange={(e) => setSplitIntoQuestions(e.target.checked)}
                            className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-700">Split into separate questions</span>
                            <p className="text-xs text-gray-500">
                              If unchecked, AI will keep all content as a single question
                            </p>
                          </div>
                        </label>

                        {/* Extract rubrics toggle */}
                        <label className="flex items-start cursor-pointer">
                          <input
                            type="checkbox"
                            checked={extractRubrics}
                            onChange={(e) => setExtractRubrics(e.target.checked)}
                            className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-700">Extract/generate rubrics</span>
                            <p className="text-xs text-gray-500">
                              If unchecked, no rubrics will be created
                            </p>
                          </div>
                        </label>

                        {/* Custom context input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional context for AI (optional)
                          </label>
                          <textarea
                            value={customContext}
                            onChange={(e) => setCustomContext(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            rows={3}
                            placeholder="E.g., 'This is a midterm exam for an HCI course. Focus on design principles and user research methods.'"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Provide additional context to help AI better understand the exam structure
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* File Upload Section */}
                    {uploadMode === 'file' && (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Select PDF or Markdown File
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                          <input
                            type="file"
                            accept="application/pdf,.md,.markdown"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer"
                          >
                            <div className="text-6xl mb-3">📄</div>
                            <p className="text-gray-700 font-semibold mb-2">
                              {selectedFile ? selectedFile.name : 'Click to select a file'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Supported: PDF (.pdf) and Markdown (.md) files
                            </p>
                          </label>
                        </div>

                        {selectedFile && (
                          <div className="mt-4">
                            <button
                              onClick={extractFromInput}
                              disabled={isExtracting}
                              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors w-full"
                            >
                              {isExtracting ? '🔄 Extracting... This may take a minute' : '🚀 Extract Questions & Rubrics'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Paste Section */}
                    {uploadMode === 'text' && (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Paste Exam Content
                        </label>
                        <textarea
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                          rows={12}
                          placeholder="Paste your exam content here...

Example:
Question 1: What is UX design? (25 points)
Answer should demonstrate understanding of user experience principles.

Question 2: Describe the design thinking process. (25 points)
Include all stages and explain each one.
..."
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          Tip: Include question numbers, text, and point values for best results
                        </p>

                        {pastedText.trim() && (
                          <div className="mt-4">
                            <button
                              onClick={extractFromInput}
                              disabled={isExtracting}
                              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors w-full"
                            >
                              {isExtracting ? '🔄 Extracting... This may take a minute' : '🚀 Extract Questions & Rubrics'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Error Message */}
                {extractionError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{extractionError}</p>
                    {extractionError.includes('API key') && (
                      <Link
                        href="/settings"
                        className="text-red-600 hover:text-red-800 text-sm underline mt-2 inline-block"
                      >
                        Go to Settings
                      </Link>
                    )}
                  </div>
                )}

                {/* Extraction Summary */}
                {extractionSummary && extractedQuestions.length > 0 && (
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">✨ Extraction Complete</h3>
                    <p className="text-purple-800 text-sm">{extractionSummary}</p>
                    <p className="text-purple-700 text-sm mt-2">
                      Found {extractedQuestions.length} question(s). Review and edit them below before confirming.
                    </p>
                  </div>
                )}

                {/* Extracted Questions - Editable */}
                {extractedQuestions.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Review & Edit Extracted Questions</h3>
                      <p className="text-sm text-gray-600">You can edit any field before confirming</p>
                    </div>

                    <div className="space-y-6 mb-6">
                      {extractedQuestions.map((question, qIndex) => (
                        <div key={qIndex} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-lg font-bold text-gray-900">
                              Question {question.questionNumber}
                            </h4>
                            <button
                              onClick={() => removeExtractedQuestion(qIndex)}
                              className="text-red-600 hover:text-red-800 font-semibold text-sm"
                            >
                              Remove
                            </button>
                          </div>

                          {/* Question Text */}
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Question Text
                            </label>
                            <textarea
                              value={question.questionText}
                              onChange={(e) => editExtractedQuestion(qIndex, 'questionText', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              rows={3}
                            />
                          </div>

                          {/* Points Percentage */}
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Points Percentage (% of total)
                            </label>
                            <input
                              type="number"
                              value={question.pointsPercentage}
                              onChange={(e) => editExtractedQuestion(qIndex, 'pointsPercentage', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              min={0}
                              max={100}
                              step={0.1}
                            />
                          </div>

                          {/* Rubrics */}
                          <div className="mt-4">
                            <h5 className="font-semibold text-gray-800 mb-3">
                              Rubrics ({question.rubrics.length})
                            </h5>
                            <div className="space-y-4">
                              {question.rubrics.map((rubric, rIndex) => (
                                <div key={rIndex} className="bg-white p-4 rounded-lg border border-gray-200">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Criteria Name
                                      </label>
                                      <input
                                        type="text"
                                        value={rubric.criteriaName}
                                        onChange={(e) => editExtractedRubric(qIndex, rIndex, 'criteriaName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                                      />
                                    </div>
                                    <button
                                      onClick={() => removeExtractedRubric(qIndex, rIndex)}
                                      className="ml-3 text-red-600 hover:text-red-800 text-sm font-semibold"
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Performance Levels
                                    </label>
                                    {rubric.levels.map((level, lIndex) => (
                                      <div key={lIndex} className="bg-gray-50 p-3 rounded border border-gray-200">
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                          <div>
                                            <label className="block text-xs text-gray-600 mb-1">Level Name</label>
                                            <input
                                              type="text"
                                              value={level.name}
                                              onChange={(e) => editExtractedRubric(qIndex, rIndex, 'name', e.target.value, lIndex)}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs text-gray-600 mb-1">Percentage</label>
                                            <input
                                              type="number"
                                              value={level.percentage}
                                              onChange={(e) => editExtractedRubric(qIndex, rIndex, 'percentage', Number(e.target.value), lIndex)}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500"
                                              min={0}
                                              max={100}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">Description</label>
                                          <textarea
                                            value={level.description}
                                            onChange={(e) => editExtractedRubric(qIndex, rIndex, 'description', e.target.value, lIndex)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500"
                                            rows={2}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={closePDFUpload}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={approveExtractedData}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        ✓ Confirm & Add All Questions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Batch Upload Modal */}
        {showBatchUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">📦 Batch Upload Submissions</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Upload multiple student submissions at once. AI will extract names, emails, and answers automatically.
                    </p>
                  </div>
                  <button
                    onClick={closeBatchUpload}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                {!batchUploadId && (
                  <>
                    {/* File Upload Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors mb-6"
                    >
                      <input
                        type="file"
                        accept="application/pdf,image/*,.md,.markdown,text/*"
                        multiple
                        onChange={handleBatchFileSelect}
                        className="hidden"
                        id="batch-file-upload"
                      />
                      <label htmlFor="batch-file-upload" className="cursor-pointer">
                        <div className="text-6xl mb-3">📁</div>
                        <p className="text-gray-700 font-semibold mb-2">
                          Click to select files or drag and drop here
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported: PDF, Images (with OCR), Markdown, Text files
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Multiple files can be selected at once
                        </p>
                      </label>
                    </div>

                    {/* Selected Files List */}
                    {selectedBatchFiles.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          Selected Files ({selectedBatchFiles.length})
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {selectedBatchFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-2xl">
                                  {file.type.startsWith('image/') ? '🖼️' : '📄'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeBatchFile(index)}
                                className="text-red-600 hover:text-red-800 font-semibold text-sm px-3"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Start Upload Button */}
                    {selectedBatchFiles.length > 0 && (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={closeBatchUpload}
                          className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={startBatchUpload}
                          disabled={isProcessingBatch}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          {isProcessingBatch ? '🔄 Processing...' : `🚀 Start Processing ${selectedBatchFiles.length} File(s)`}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Processing Status */}
                {batchUploadId && batchStatus && (
                  <div>
                    {/* Overall Progress */}
                    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-purple-900">
                          {batchStatus.status === 'processing' && '🔄 Processing Files...'}
                          {batchStatus.status === 'completed' && '✅ All Files Processed!'}
                          {batchStatus.status === 'partial' && '⚠️ Processing Complete (with errors)'}
                          {batchStatus.status === 'failed' && '❌ Processing Failed'}
                        </h3>
                        <span className="text-sm font-semibold text-purple-800">
                          {batchStatus.completedFiles + batchStatus.failedFiles} / {batchStatus.totalFiles}
                        </span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-3 mb-2">
                        <div
                          className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${((batchStatus.completedFiles + batchStatus.failedFiles) / batchStatus.totalFiles) * 100}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-purple-700">
                        <span>✅ {batchStatus.completedFiles} completed</span>
                        {batchStatus.failedFiles > 0 && <span>❌ {batchStatus.failedFiles} failed</span>}
                      </div>
                    </div>

                    {/* Individual File Status */}
                    <div className="space-y-3 mb-6">
                      <h4 className="text-md font-semibold text-gray-800">File Details:</h4>
                      {batchStatus.files.map((file: any, index: number) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${
                            file.status === 'completed' ? 'bg-green-50 border-green-200' :
                            file.status === 'error' ? 'bg-red-50 border-red-200' :
                            file.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl">{getStatusIcon(file.status)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{file.fileName}</p>
                                {file.status === 'processing' && (
                                  <p className="text-sm text-blue-700 mt-1">{getStepText(file.currentStep)}</p>
                                )}
                                {file.status === 'completed' && file.studentName && (
                                  <div className="text-sm text-green-700 mt-1">
                                    <p>👤 {file.studentName}</p>
                                    <p>📧 {file.studentEmail}</p>
                                  </div>
                                )}
                                {file.status === 'error' && (
                                  <p className="text-sm text-red-700 mt-1">{file.error}</p>
                                )}
                              </div>
                            </div>
                            {file.submissionId && (
                              <Link
                                href={`/grade/${file.submissionId}`}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-semibold transition-colors ml-2"
                              >
                                View
                              </Link>
                            )}
                          </div>
                          
                          {/* Progress Bar for Individual File */}
                          {file.status === 'processing' && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${file.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    {(batchStatus.status === 'completed' || batchStatus.status === 'partial' || batchStatus.status === 'failed') && (
                      <div className="flex justify-end">
                        <button
                          onClick={closeBatchUpload}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          ✓ Done
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
