'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
}

export default function Home() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    const res = await fetch('/api/assignments');
    const data = await res.json();
    setAssignments(data);
  };

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    setTitle('');
    setDescription('');
    setIsCreating(false);
    fetchAssignments();
  };

  const deleteAssignment = async (id: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
      fetchAssignments();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">HCI Grader</h1>
          <p className="text-gray-600">Manage assignments, rubrics, and grading efficiently</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Assignments</h2>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              {isCreating ? 'Cancel' : '+ New Assignment'}
            </button>
          </div>

          {isCreating && (
            <form onSubmit={createAssignment} className="mb-8 p-6 bg-gray-50 rounded-xl">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Create Assignment
              </button>
            </form>
          )}

          <div className="space-y-4">
            {assignments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No assignments yet. Create your first assignment to get started!
              </p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment._id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {assignment.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{assignment.description}</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(assignment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link
                        href={`/assignment/${assignment._id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Manage
                      </Link>
                      <button
                        onClick={() => deleteAssignment(assignment._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
