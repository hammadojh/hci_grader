'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Settings {
    _id?: string;
    openaiApiKey: string;
    aiSystemPrompt: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [aiSystemPrompt, setAiSystemPrompt] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings(data);
            setOpenaiApiKey(data.openaiApiKey || '');
            setAiSystemPrompt(data.aiSystemPrompt || '');
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
                    aiSystemPrompt,
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <Link href="/" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Settings</h1>
                    <p className="text-gray-600">Configure AI Rubric Helper and other preferences</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={saveSettings}>
                        {/* OpenAI API Key Section */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">OpenAI API Configuration</h2>
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
                                    OpenAI API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={openaiApiKey}
                                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-24"
                                        placeholder="sk-..."
                                        required
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
                                    Your API key is stored securely and only used for generating rubric suggestions.
                                    The AI Rubric Helper uses GPT-4o for generating rubric suggestions.
                                </p>
                            </div>
                        </div>

                        {/* AI System Prompt Section */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">AI Agent System Prompt</h2>
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
                                    System Prompt
                                </label>
                                <textarea
                                    value={aiSystemPrompt}
                                    onChange={(e) => setAiSystemPrompt(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                                    rows={15}
                                    placeholder="Enter the system prompt for the AI rubric helper..."
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    This prompt guides how the AI generates rubric suggestions. Customize it to match your grading philosophy and requirements.
                                </p>
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
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">About AI Rubric Helper</h3>
                    <p className="text-blue-800 text-sm mb-2">
                        The AI Rubric Helper uses advanced language models to assist you in creating comprehensive rubrics. It can:
                    </p>
                    <ul className="text-blue-800 text-sm space-y-1 ml-6 list-disc">
                        <li>Generate rubric criteria based on your assignment description</li>
                        <li>Create detailed performance levels with clear descriptors</li>
                        <li>Suggest appropriate weights for different criteria</li>
                        <li>Refine rubrics based on your feedback</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

