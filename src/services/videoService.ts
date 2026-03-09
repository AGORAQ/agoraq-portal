import { GoogleGenAI } from "@google/genai";

export async function generateTutorialVideo() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select an API key in the settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: "A professional 3D animated tutorial video for the 'AgoraQ' financial portal. The video shows a clean, modern user interface with tabs for 'Dashboard', 'Sales', 'CRM', 'Financial', and 'Academy'. Smooth camera pans show animated charts, data tables, and video thumbnails. The design is elegant with corporate blue and white colors. 4K resolution, cinematic lighting.",
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    return downloadLink;
  } catch (error) {
    console.error("Video generation error:", error);
    throw error;
  }
}
