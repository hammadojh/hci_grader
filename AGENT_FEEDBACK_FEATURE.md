# Agent Feedback Feature

## Overview
Enhanced the grading agents to not only select rubric levels but also provide justification for their choices and improvement suggestions. The feedback is appended to the feedback field in a structured format.

## Changes Made

### 1. Data Model Updates (`models/Answer.ts`)
- Updated `IAgentSuggestion` interface to include:
  - `justification?: string` - Brief explanation of why the rubric level was chosen
  - `improvementSuggestion?: string` - Brief suggestion on how to improve the answer
- Updated `AgentSuggestionSchema` to store these new fields

### 2. API Endpoint Updates (`app/api/agent-suggest/route.ts`)
- Modified the system prompt to instruct the AI to generate:
  - A brief justification (1-2 sentences) for the selected level
  - A brief improvement suggestion (1 sentence)
- Updated the expected JSON response format to include these fields:
```json
{
  "suggestions": [
    {
      "rubricId": "rubric_id_here",
      "suggestedLevelIndex": 0,
      "justification": "Brief explanation of why this level was chosen",
      "improvementSuggestion": "Brief suggestion on how to improve"
    }
  ]
}
```

### 3. Frontend Updates (`app/grade-by-question/[assignmentId]/[questionId]/page.tsx`)
- Updated `AgentSuggestion` interface to match the data model
- Modified `generateAgentSuggestions` function to:
  - Extract justification and improvement suggestions from API response
  - **Append** (not override) agent feedback to existing feedback
  - Format feedback as:
    ```
    [existing feedback]
    
    ----
    
    {agentName} feedback:
    {justification} {improvementSuggestion}
    ```
  - Automatically save the updated feedback to the database

## Feedback Format

All agent feedback is written in **second person** (directly addressing the student) to make it more personal and actionable.

When multiple agents provide feedback, it appears in the following format:

```
g1 feedback:
You demonstrate good understanding of core concepts. Consider adding more specific examples to strengthen your points.

----

g2 feedback:
Your response shows excellent analysis. You could improve by connecting your ideas to real-world applications.

----

g3 feedback:
Your explanation is clear but lacks depth in certain areas. Try to provide more detailed reasoning for your conclusions.
```

## Key Features
1. **Non-destructive**: Agent feedback is appended, never overwriting existing feedback
2. **Multi-agent support**: Multiple agents can contribute feedback for the same rubric
3. **Structured format**: Clear separation between different agents' feedback using `----` dividers
4. **Auto-save**: Feedback is automatically saved to the database when agents run
5. **Editable**: Human graders can still manually edit the feedback field after agents provide input

## Usage
1. Create grading agents for a question (g1, g2, g3, etc.)
2. Click "Run" on an individual agent or "Run All" to execute all agents
3. Agents will:
   - Suggest rubric levels (shown as colored circles)
   - Append justification and improvement suggestions to the feedback field
4. Review and edit the feedback as needed
5. Feedback is automatically saved to the database

## Technical Notes
- The feedback is stored in the `feedback` field of each `CriteriaEvaluation`
- Each agent's contribution is tracked via the `agentSuggestions` array
- If an agent runs multiple times, its previous feedback is replaced (not duplicated)
- The AI uses GPT-4o-mini for generating suggestions

