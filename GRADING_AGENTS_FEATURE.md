# Grading Agents Feature

## Overview
The grading agents feature allows instructors to add multiple AI-powered grading agents to assist with evaluating student answers. Each agent acts as a different instructor perspective and suggests levels for each rubric criteria.

## Key Features

### 1. **Multiple Agents Support**
- Add one or more grading agents per question
- Each agent is named sequentially (g1, g2, g3, etc.)
- Each agent has a unique color for visual distinction
- Up to 8 distinct colors available (blue, green, amber, red, purple, pink, teal, orange)

### 2. **AI-Powered Suggestions**
- Each agent analyzes:
  - The question text
  - The current student's answer
  - All other student answers (for calibration)
  - All rubric criteria and levels
- Generates suggestions for which level to select for each criteria
- Uses OpenAI GPT-4o-mini for consistent, objective evaluation

### 3. **Visual Feedback**
- Agent suggestions appear as **colored circles** next to level names
- Circle shows the agent's identifier (g1, g2, etc.) in the agent's color
- Multiple agents can suggest the same level (showing agreement)
- Agents suggesting different levels show disagreement
- Helps instructors see at a glance how agents agree or disagree

### 4. **User Control**
- Final grading decision always belongs to the instructor
- Instructors can accept, modify, or ignore agent suggestions
- Agents are managed through the "🤖 Agents" button in the header
- Easy add/remove functionality

## How to Use

### Step 1: Add Grading Agents
1. Navigate to the "Grade by Question" page for any question
2. Click the **"🤖 Agents (0)"** button in the header
3. Click **"+ Add New Agent"**
4. Repeat to add more agents (g1, g2, g3, etc.)

### Step 2: Generate Suggestions
1. In the agent manager panel, click **"✨ Generate"** for an agent
2. The agent will analyze ALL student answers for this question
3. Wait for the generation to complete
4. Agent suggestions will appear as colored circles next to levels

### Step 3: Review and Grade
1. For each student answer, view the rubric criteria
2. Look at the agent suggestions (colored circles)
3. See which levels different agents recommend
4. Make your final decision by clicking on a level
5. Save your grades as usual

### Visual Guide

```
Level Name (90%)          ← Level option
  [g1][g2]               ← Agent circles showing g1 and g2 suggest this level
  Description...
  
Level Name (70%)          
  [g3]                   ← Only g3 suggests this level
  Description...
  
Level Name (50%)          
                         ← No agents suggest this level
  Description...
```

## Technical Implementation

### New Models
- **GradingAgent**: Stores agent configuration (name, color, questionId)
- **AgentSuggestion**: Embedded in Answer model, tracks which level each agent suggests

### New API Endpoints
- `POST /api/grading-agents` - Create a new agent
- `GET /api/grading-agents?questionId=X` - Get all agents for a question
- `DELETE /api/grading-agents?agentId=X` - Remove an agent
- `POST /api/agent-suggest` - Generate AI suggestions for an agent

### Database Schema Changes
- **Answer.criteriaEvaluations** now includes optional `agentSuggestions` array
- Each suggestion contains `agentId` and `suggestedLevelIndex`

### UI Components
- Agent manager panel (collapsible)
- Agent list with color-coded badges
- Generate and remove buttons per agent
- Colored circles integrated into level selection UI

## Benefits

1. **Consistency**: Multiple agents help ensure grading consistency across students
2. **Time-Saving**: AI suggestions speed up the grading process
3. **Perspective**: Different agents may catch different aspects of quality
4. **Transparency**: Visual indicators show agreement/disagreement clearly
5. **Control**: Instructor always makes the final decision

## Future Enhancements

Potential improvements for future versions:
- Agent feedback/reasoning (why they chose a particular level)
- Configurable agent personas (strict vs. lenient)
- Agent confidence scores
- Bulk apply agent suggestions
- Export agent agreement statistics

