'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  totalPoints: number;
  createdAt: string;
}

export default function Home() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalPoints, setTotalPoints] = useState(100);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTotalPoints, setEditTotalPoints] = useState(100);

  const fetchAssignments = async () => {
    const res = await fetch('/api/assignments');
    const data = await res.json();
    setAssignments(data);
  };

  useEffect(() => {
    // Fetch assignments on component mount
    // eslint-disable-next-line
    fetchAssignments();
  }, []);

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, totalPoints }),
    });
    setTitle('');
    setDescription('');
    setTotalPoints(100);
    setIsCreating(false);
    fetchAssignments();
  };

  const deleteAssignment = async (id: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
      fetchAssignments();
    }
  };

  const startEditing = (assignment: Assignment) => {
    setEditingId(assignment._id);
    setEditTitle(assignment.title);
    setEditDescription(assignment.description);
    setEditTotalPoints(assignment.totalPoints);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
    setEditTotalPoints(100);
  };

  const updateAssignment = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    await fetch(`/api/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: editTitle, 
        description: editDescription, 
        totalPoints: editTotalPoints 
      }),
    });
    setEditingId(null);
    fetchAssignments();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">HCI Grader</h1>
              <p className="text-gray-600">Manage assignments, rubrics, and grading efficiently</p>
            </div>
            <Link
              href="/settings"
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              {isCreating ? 'Cancel' : '+ New Assignment'}
            </button>
          </div>

          {isCreating && (
            <form onSubmit={createAssignment} className="mb-6 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
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
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Points
                </label>
                <input
                  type="number"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min={1}
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Create Assignment
              </button>
            </form>
          )}

          <div className="space-y-6">
            {assignments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No assignments yet. Create your first assignment to get started!
              </p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment._id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-indigo-300 transition-all"
                >
                  {editingId === assignment._id ? (
                    <form onSubmit={(e) => updateAssignment(e, assignment._id)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          rows={3}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Points
                        </label>
                        <input
                          type="number"
                          value={editTotalPoints}
                          onChange={(e) => setEditTotalPoints(Number(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          min={1}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {assignment.title}
                        </h3>
                        <p className="text-gray-600 mb-2">{assignment.description}</p>
                        <p className="text-sm text-indigo-600 font-semibold mb-2">
                          Total Points: {assignment.totalPoints}
                        </p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(assignment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => startEditing(assignment)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Edit
                        </button>
                        <Link
                          href={`/assignment/${assignment._id}`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
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
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
