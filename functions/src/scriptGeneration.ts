import * as functions from 'firebase-functions';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: functions.config().openai.key,
});
const openai = new OpenAIApi(configuration);

export const generateScript = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { prompt } = data;

  if (!prompt) {
    throw new functions.https.HttpsError('invalid-argument', 'Prompt is required');
  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates engaging scripts for Vostcard videos. Keep scripts conversational, friendly, and around 30 seconds when spoken."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const script = completion.data.choices[0]?.message?.content?.trim();
    
    if (!script) {
      throw new functions.https.HttpsError('internal', 'Failed to generate script');
    }

    return { script };
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate script');
  }
}); 