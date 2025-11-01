'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Settings {
    _id?: string;
    openaiApiKey?: string; // Optional - for PDF extraction only
    openRouterApiKey: string; // Required - for all AI features
    aiSystemPrompt: string;
    gradingAgentPrompt: string;
    defaultModel1?: string;
    defaultModel2?: string;
    defaultModel3?: string;
    extractRubrics?: boolean;
    splitIntoQuestions?: boolean;
    extractionContext?: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [openRouterApiKey, setOpenRouterApiKey] = useState('');
    const [aiSystemPrompt, setAiSystemPrompt] = useState('');
    const [gradingAgentPrompt, setGradingAgentPrompt] = useState('');
  const [defaultModel1, setDefaultModel1] = useState('openai/gpt-5');
  const [defaultModel2, setDefaultModel2] = useState('google/gemini-2.5-pro');
  const [defaultModel3, setDefaultModel3] = useState('anthropic/claude-4.5-sonnet');
    const [extractRubrics, setExtractRubrics] = useState(true);
    const [splitIntoQuestions, setSplitIntoQuestions] = useState(true);
    const [extractionContext, setExtractionContext] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showOpenRouterApiKey, setShowOpenRouterApiKey] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings(data);
            setOpenaiApiKey(data.openaiApiKey || '');
            setOpenRouterApiKey(data.openRouterApiKey || '');
            setAiSystemPrompt(data.aiSystemPrompt || '');
            setGradingAgentPrompt(data.gradingAgentPrompt || '');
      setDefaultModel1(data.defaultModel1 || 'openai/gpt-5');
      setDefaultModel2(data.defaultModel2 || 'google/gemini-2.5-pro');
      setDefaultModel3(data.defaultModel3 || 'anthropic/claude-4.5-sonnet');
            setExtractRubrics(data.extractRubrics !== undefined ? data.extractRubrics : true);
            setSplitIntoQuestions(data.splitIntoQuestions !== undefined ? data.splitIntoQuestions : true);
            setExtractionContext(data.extractionContext || '');
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage('');

        try {
            const response = await fetch('/api/settings', {
                method: settings?._id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    openaiApiKey,
                    openRouterApiKey,
                    aiSystemPrompt,
                    gradingAgentPrompt,
                    defaultModel1,
                    defaultModel2,
                    defaultModel3,
                    extractRubrics,
                    splitIntoQuestions,
                    extractionContext,
                }),
            });

            if (response.ok) {
                setSaveMessage('Settings saved successfully!');
                fetchSettings();
            } else {
                setSaveMessage('Failed to save settings. Please try again.');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveMessage('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    const resetSystemPrompt = () => {
        const defaultPrompt = `You are an expert educational assessment designer. Your role is to help instructors create comprehensive, fair, and well-structured rubrics for grading assignments.

When creating rubrics:
1. Consider the learning objectives and what skills/knowledge are being assessed
2. Create clear, measurable criteria that avoid ambiguity
3. Define distinct performance levels with specific descriptors
4. Assign appropriate weights based on the importance of each criterion
5. Use language that is clear to both instructors and students
6. Ensure the rubric promotes consistency in grading

For each criterion, provide:
- A clear name that identifies what is being assessed
- Multiple performance levels (typically 3-5 levels)
- Specific, observable descriptions for each level
- Percentage weights that reflect the relative importance

Always aim for rubrics that are practical, fair, and promote learning.`;
        setAiSystemPrompt(defaultPrompt);
    };

    const resetGradingAgentPrompt = () => {
        const defaultPrompt = `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

For each criteria in the rubric, you must select the most appropriate level based on the student's answer quality.

You should:
1. Carefully read the question and the student's answer
2. Compare the answer against each rubric criteria
3. Select the level that best matches the answer's quality for each criteria
4. Consider all answers from other students for context (to calibrate your grading)

Return your evaluation as a JSON object with the following structure:
{
  "suggestions": [
    {
      "rubricId": "rubric_id_here",
      "suggestedLevelIndex": 0
    }
  ]
}

Be objective and consistent in your evaluation.`;
        setGradingAgentPrompt(defaultPrompt);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200">
                    <Link href="/" className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block font-semibold">
                        ← Back to Home
                    </Link>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
                    <p className="text-gray-600">Configure AI Rubric Helper and other preferences</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                    <form onSubmit={saveSettings}>
                        {/* OpenRouter API Key Section - Primary */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">OpenRouter API Configuration ⭐</h2>
                                <a
                                    href="https://openrouter.ai/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800 text-sm underline"
                                >
                                    Get API Key
                                </a>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    OpenRouter API Key (Required)
                                </label>
                                <div className="relative">
                                    <input
                                        type={showOpenRouterApiKey ? 'text' : 'password'}
                                        value={openRouterApiKey}
                                        onChange={(e) => setOpenRouterApiKey(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-24"
                                        placeholder="sk-or-..."
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOpenRouterApiKey(!showOpenRouterApiKey)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                                    >
                                        {showOpenRouterApiKey ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    <strong>Required:</strong> OpenRouter provides unified access to models from OpenAI, Google, Anthropic, and more with a single API key.
                                    All AI features (rubric generation, grading agents, exam extraction, etc.) use OpenRouter.
                                </p>
                            </div>

                            {/* Default Models for Grading Agents */}
                            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Default Models for Grading Agents</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Configure which AI models to use for each of the three default grading agents. You can change these later on the grading page.
                                </p>
                                
                                <div className="space-y-4">
                                    {/* Agent 1 Model */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Agent 1 Default Model
                                        </label>
                                        <input
                                            type="text"
                                            value={defaultModel1}
                                            onChange={(e) => setDefaultModel1(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="e.g., openai/gpt-5"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Example: openai/gpt-5 🔥 (Latest), openai/gpt-4o, openai/o1-preview
                                        </p>
                                    </div>

                                    {/* Agent 2 Model */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Agent 2 Default Model
                                        </label>
                                        <input
                                            type="text"
                                            value={defaultModel2}
                                            onChange={(e) => setDefaultModel2(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="e.g., google/gemini-2.5-pro"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Example: google/gemini-2.5-pro 🔥 (Latest), google/gemini-2.0-flash-exp:free
                                        </p>
                                    </div>

                                    {/* Agent 3 Model */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Agent 3 Default Model
                                        </label>
                                        <input
                                            type="text"
                                            value={defaultModel3}
                                            onChange={(e) => setDefaultModel3(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="e.g., anthropic/claude-4.5-sonnet"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Example: anthropic/claude-4.5-sonnet 🔥 (Latest), anthropic/claude-3.5-sonnet
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>💡 Tip:</strong> Visit <a href="https://openrouter.ai/docs#models" target="_blank" rel="noopener noreferrer" className="underline font-semibold">OpenRouter Models</a> to see the full list of available models and their identifiers.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* OpenAI API Key Section - Optional */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">OpenAI API (Optional)</h2>
                                <a
                                    href="https://platform.openai.com/api-keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800 text-sm underline"
                                >
                                    Get API Key
                                </a>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    OpenAI API Key (Optional - for PDF extraction only)
                                </label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={openaiApiKey}
                                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-24"
                                        placeholder="sk-... (optional)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                                    >
                                        {showApiKey ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    <strong>Optional:</strong> Only required for PDF exam extraction (uses OpenAI Assistants API which isn't supported by OpenRouter).
                                    All other features use OpenRouter. You can skip this if you don't need PDF extraction.
                                </p>
                            </div>
                        </div>

                        {/* AI Rubric Helper System Prompt Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">AI Rubric Helper System Prompt</h2>
                                <button
                                    type="button"
                                    onClick={resetSystemPrompt}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                                >
                                    Reset to Default
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Rubric Generation Prompt
                                </label>
                                <textarea
                                    value={aiSystemPrompt}
                                    onChange={(e) => setAiSystemPrompt(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                                    rows={12}
                                    placeholder="Enter the system prompt for the AI rubric helper..."
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    This prompt guides how the AI generates rubric suggestions when you use the AI Helper feature.
                                </p>
                            </div>
                        </div>

                        {/* Grading Agent System Prompt Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">Grading Agent System Prompt</h2>
                                <button
                                    type="button"
                                    onClick={resetGradingAgentPrompt}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                                >
                                    Reset to Default
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Agent Evaluation Prompt
                                </label>
                                <textarea
                                    value={gradingAgentPrompt}
                                    onChange={(e) => setGradingAgentPrompt(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                                    rows={12}
                                    placeholder="Enter the system prompt for grading agents..."
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    This prompt guides how grading agents (g1, g2, g3) evaluate student answers and suggest rubric levels.
                                </p>
                            </div>
                        </div>

                        {/* AI Extraction Default Preferences Section */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Exam Extraction Defaults</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Configure default settings for the AI exam extraction feature. These can be overridden per upload.
                            </p>

                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                {/* Split into questions toggle */}
                                <label className="flex items-start cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={splitIntoQuestions}
                                        onChange={(e) => setSplitIntoQuestions(e.target.checked)}
                                        className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <div className="ml-3">
                                        <span className="text-sm font-semibold text-gray-700">Split into separate questions by default</span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            When enabled, AI will identify and split exam content into individual questions. When disabled, AI will extract only the core assignment question, excluding instructions and guidelines.
                                        </p>
                                    </div>
                                </label>

                                {/* Extract rubrics toggle */}
                                <label className="flex items-start cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={extractRubrics}
                                        onChange={(e) => setExtractRubrics(e.target.checked)}
                                        className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <div className="ml-3">
                                        <span className="text-sm font-semibold text-gray-700">Extract/generate rubrics by default</span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            When enabled, AI will extract rubrics from the document or generate appropriate ones. When disabled, no rubrics will be created.
                                        </p>
                                    </div>
                                </label>

                                {/* Default extraction context */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Default context for AI extraction (optional)
                                    </label>
                                    <textarea
                                        value={extractionContext}
                                        onChange={(e) => setExtractionContext(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        rows={3}
                                        placeholder="E.g., 'Exams are typically for HCI courses focusing on design principles and user research.'"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This context will be used by default to help AI better understand exam structure. Can be overridden per upload.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button and Message */}
                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                            >
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>

                            {saveMessage && (
                                <p className={`text-sm font-semibold ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {saveMessage}
                                </p>
                            )}
                        </div>
                    </form>
                </div>

                {/* Information Section */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mt-6">
                    <h3 className="text-lg font-bold text-indigo-900 mb-2">About AI Features</h3>
                    <p className="text-indigo-800 text-sm mb-2">
                        The AI-powered features use advanced language models to assist you with:
                    </p>
                    
                    <div className="mb-3">
                        <h4 className="text-sm font-semibold text-indigo-900 mb-1">AI Rubric Helper</h4>
                        <ul className="text-indigo-800 text-sm space-y-1 ml-6 list-disc">
                            <li>Generate rubric criteria based on your assignment description</li>
                            <li>Create detailed performance levels with clear descriptors</li>
                            <li>Suggest appropriate weights for different criteria</li>
                            <li>Refine rubrics based on your feedback</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-semibold text-indigo-900 mb-1">AI Exam Extraction</h4>
                        <ul className="text-indigo-800 text-sm space-y-1 ml-6 list-disc">
                            <li>Extract questions from PDF or markdown exam files</li>
                            <li>Automatically generate or extract rubrics from exam documents</li>
                            <li>Parse point values and distribute percentages</li>
                            <li>Customize extraction behavior with per-upload options</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

