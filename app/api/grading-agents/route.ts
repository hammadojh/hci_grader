import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { GradingAgent } from '@/models/GradingAgent';

// GET all grading agents for a question
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    const agents = await GradingAgent.find({ questionId }).sort({ createdAt: 1 });
    return NextResponse.json(agents);
  } catch (error: any) {
    console.error('GET /api/grading-agents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new grading agent
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { questionId, name, color, model } = body;

    if (!questionId || !name || !color) {
      return NextResponse.json(
        { error: 'questionId, name, and color are required' },
        { status: 400 }
      );
    }

    const agent = await GradingAgent.create({ 
      questionId, 
      name, 
      color,
      model: model || 'openai/gpt-4o-mini'
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/grading-agents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a grading agent (for model switching)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { agentId, model } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const agent = await GradingAgent.findById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (model !== undefined) {
      agent.model = model;
    }

    await agent.save();
    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('PUT /api/grading-agents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a grading agent
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    await GradingAgent.findByIdAndDelete(agentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/grading-agents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

