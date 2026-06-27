import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

// Only initialize if key is present and not a placeholder
const ai = (apiKey && apiKey !== "MY_GEMINI_API_KEY")
  ? new GoogleGenAI({ apiKey })
  : null;

export interface HazardPrediction {
  potential_risks: string[];
  safety_precautions: string[];
  emergency_measures: string[];
}

export interface CompatibilityResult {
  is_compatible: boolean;
  warnings: string;
  reaction_risk: string;
}

export const aiService = {
  async predictHazards(chemicalName: string, formula: string, molecularWeight: number): Promise<HazardPrediction> {
    if (!ai) {
      return {
        potential_risks: ["Gemini AI is not configured. Please set a valid GEMINI_API_KEY in your .env file."],
        safety_precautions: ["Always consult the official Safety Data Sheet (SDS) for this chemical."],
        emergency_measures: ["Contact your safety officer or emergency services if an incident occurs."]
      };
    }

    const prompt = `Analyze this chemical: 
      Name: ${chemicalName}
      Formula: ${formula}
      Molecular Weight: ${molecularWeight} g/mol
      
      Predict potential lab hazards, safety precautions, and emergency measures.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional chemical safety expert. Provide accurate, structured hazard analysis.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            potential_risks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of potential hazards like 'highly flammable', 'corrosive', etc."
            },
            safety_precautions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific lab safety steps needed when handling this chemical."
            },
            emergency_measures: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "First aid or spill response steps."
            }
          },
          required: ["potential_risks", "safety_precautions", "emergency_measures"]
        }
      }
    });

    return JSON.parse(response.text.trim()) as HazardPrediction;
  },

  async checkCompatibility(chem1: string, chem2: string): Promise<CompatibilityResult> {
    if (!ai) {
      return {
        is_compatible: false,
        warnings: "Gemini AI is not configured. Please set a valid GEMINI_API_KEY in your .env file to use AI compatibility checks.",
        reaction_risk: "Cannot assess — AI service unavailable."
      };
    }

    const prompt = `Check if ${chem1} and ${chem2} are compatible for storage or mixture.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a laboratory safety advisor. Assess chemical compatibility strictly based on reactivity groups.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_compatible: { type: Type.BOOLEAN },
            warnings: { type: Type.STRING },
            reaction_risk: { type: Type.STRING, description: "Description of the reaction risk if incompatible (e.g., 'Exothermic reaction', 'Toxic gas release')." }
          },
          required: ["is_compatible", "warnings", "reaction_risk"]
        }
      }
    });

    return JSON.parse(response.text.trim()) as CompatibilityResult;
  }
};
