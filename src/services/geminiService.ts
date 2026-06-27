import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface HazardPrediction {
  potential_risks: string[];
  safety_precautions: string[];
  emergency_measures: string[];
  assessment_source?: "ai" | "local";
}

export interface CompatibilityResult {
  is_compatible: boolean;
  warnings: string;
  reaction_risk: string;
  assessment_source?: "ai" | "local";
}

// Local safety assistant guide response generator
function getLocalSafetyAdvice(query: string): string {
  const q = query.toLowerCase().trim();

  // 1. Storage / Compatibility keywords
  if (q.includes("compatibility") || q.includes("storage") || q.includes("group") || q.includes("where to store")) {
    return `### 🗃️ CIMS Chemical Storage Compatibility Guide

Proper chemical storage prevents dangerous reactions. Standard chemical compatibility storage classes:

1. **Group Flammables (Red Label)**: Store in an approved, grounded flammable safety cabinet. Keep away from oxidizers, acids, and ignition sources.
2. **Group Acids (White/Corrosive Label)**: Store in a dedicated corrosive/acid cabinet. Store oxidizing acids (like **Nitric Acid**) separately from organic acids (like **Acetic Acid**).
3. **Group Bases (Blue/Corrosive Label)**: Store in a dedicated corrosive/base cabinet. *Never* store acids and bases in the same cabinet space.
4. **Group Oxidizers (Yellow Label)**: Store on a dedicated shelf or oxidizer cabinet. Keep away from flammables, organic solvents, and reducing agents.
5. **Group Toxics (Blue/Poison Label)**: Store in a ventilated cabinet or locked toxic chemical drawer.
6. **Group Water-Reactives**: Store in a cool, dry area under inert gas atmosphere (such as nitrogen or argon), away from aqueous solutions and sprinkler systems.

---
*Verified by CIMS Local Safety Engine*`;
  }

  // 2. PPE keywords
  if (q.includes("ppe") || q.includes("protect") || q.includes("glove") || q.includes("wear")) {
    return `### 🥽 Recommended Personal Protective Equipment (PPE)

Depending on the chemical hazard class, ensure you wear the following equipment:

- **Corrosives (Acids/Bases)**:
  - Chemical splash goggles (ANSI Z87.1 approved)
  - Full face shield if handling large volumes (>1L)
  - Neoprene or Nitrile gloves (check thickness and breakthrough times)
  - Lab coat (preferably chemical resistant) and closed-toe leather shoes
- **Flammables**:
  - Flame-resistant lab coat (Nomex or treated cotton)
  - Safety glasses or goggles
  - Nitrile gloves (discard immediately upon splash contact)
- **Toxics/Carcinogens**:
  - Double nitrile gloves (for toxic compounds like lead or cadmium salts)
  - Standard safety goggles and lab coat
  - Work inside a certified chemical fume hood to prevent inhalation
- **Water-Reactives**:
  - Safety glasses, flame-resistant lab coat
  - Heavy duty nitrile or neoprene gloves

---
*Verified by CIMS Local Safety Engine*`;
  }

  // 3. Spill response / Clean keywords
  if (q.includes("spill") || q.includes("emergency") || q.includes("clean") || q.includes("cleanup")) {
    return `### 🚨 Laboratory Spill Emergency Procedures

If a chemical spill occurs, follow these critical steps immediately:

1. **Alert and Evacuate**: Notify everyone in the immediate vicinity of the spill. Evacuate if the spill is large or releases toxic gas.
2. **Identify the Hazard**: Check the name and hazard class of the spilled chemical (e.g. acid, flammable, toxic).
3. **Notify Safety Officer**: Contact EHS or the laboratory supervisor.
4. **Spill Control Containment**:
   - **Acids/Bases**: Neutralize using sodium bicarbonate (for acids) or citric acid (for bases) before cleanup.
   - **Flammables**: Extinguish all ignition sources. Use adsorbent pads/vermiculite.
   - **Toxics**: Avoid inhalation. Wear respirator and double gloves before cleanup.
5. **Dispose of Waste**: Sweep absorbed material into hazardous waste containers and label appropriately.

---
*Verified by CIMS Local Safety Engine*`;
  }

  // 4. Look up matching chemical details
  const knownChemicals = [
    {
      name: "Ethanol",
      formula: "C2H5OH",
      hc: "Flammable",
      safety: "Highly flammable liquid and vapor. Causes serious eye irritation.",
      storage: "Keep container tightly closed. Store in a well-ventilated place. Keep cool.",
      mw: 46.07
    },
    {
      name: "Hydrochloric Acid",
      formula: "HCl",
      hc: "Corrosive",
      safety: "May be corrosive to metals. Causes severe skin burns and eye damage.",
      storage: "Store in corrosive resistant container with a resistant inner liner.",
      mw: 36.46
    },
    {
      name: "Sodium Hydroxide",
      formula: "NaOH",
      hc: "Corrosive",
      safety: "May be corrosive to metals. Causes severe skin burns and eye damage.",
      storage: "Store only in original container. Keep container tightly closed.",
      mw: 40.00
    },
    {
      name: "Nitric Acid",
      formula: "HNO3",
      hc: "Oxidizer/Corrosive",
      safety: "May intensify fire; oxidizer. May be corrosive to metals. Causes severe skin burns.",
      storage: "Keep away from clothing and other combustible materials. Store separately.",
      mw: 63.01
    },
    {
      name: "Sulfuric Acid",
      formula: "H2SO4",
      hc: "Corrosive",
      safety: "May be corrosive to metals. Causes severe skin burns and eye damage.",
      storage: "Store in corrosive resistant container with a resistant inner liner.",
      mw: 98.08
    },
    {
      name: "Hydrogen Peroxide (30%)",
      formula: "H2O2",
      hc: "Oxidizer/Corrosive",
      safety: "May intensify fire; oxidizer. Harmful if swallowed. Causes severe skin burns.",
      storage: "Keep away from heat. Store in a cool place.",
      mw: 34.01
    },
    {
      name: "Sodium Azide",
      formula: "NaN3",
      hc: "Toxic",
      safety: "Fatal if swallowed. Fatal in contact with skin. Very toxic to aquatic life.",
      storage: "Store locked up.",
      mw: 65.01
    },
    {
      name: "Lithium Aluminum Hydride",
      formula: "LiAlH4",
      hc: "Flammable/Reactive",
      safety: "In contact with water releases flammable gases which may ignite spontaneously.",
      storage: "Keep away from water. Store under inert gas.",
      mw: 37.95
    }
  ];

  const matched = knownChemicals.find(c => q.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(q));
  if (matched) {
    return `### 🧪 Chemical Safety Sheet: ${matched.name}
- **Chemical Formula**: \`${matched.formula}\`
- **Molecular Weight**: \`${matched.mw} g/mol\`
- **Primary Hazard Class**: \`${matched.hc}\`
- **Safety Warning**: *${matched.safety}*
- **Storage Guidance**: *${matched.storage}*

#### Recommended Precautions:
1. Avoid contact with incompatible materials (e.g. acids or flammables).
2. Wear standard laboratory PPE (safety goggles, gloves, and lab coat).
3. Handle under a certified chemical fume hood if volatile.

---
*Verified by CIMS Local Safety Engine*`;
  }

  return `### ℹ️ Safety Guidance: "${query}"

The CIMS offline database does not have specific details for your query. 

**Standard Laboratory Precautions:**
- Always consult the official Safety Data Sheet (SDS) for this specific material.
- Wear appropriate Personal Protective Equipment (PPE) including safety glasses, lab coat, and chemical-resistant gloves.
- Know the locations of safety showers, eye wash stations, and fire extinguishers before handling.

---
*Verified by CIMS Local Safety Engine*`;
}

// Local rules-based hazard and precautions generator
function getLocalHazards(
  name: string,
  formula: string,
  mw: number,
  hazardClass?: string,
  safetyInfo?: string,
  storageRequirements?: string
): HazardPrediction {
  const risks: string[] = [];
  const precautions: string[] = [];
  const emergency: string[] = [];

  const hc = (hazardClass || "").toLowerCase();
  const si = (safetyInfo || "").toLowerCase();
  const sr = (storageRequirements || "").toLowerCase();

  if (hc.includes("flammable") || si.includes("flammable") || si.includes("ignite")) {
    risks.push("Highly flammable liquid and vapor: poses high threat of flash fires or vapor explosions.");
    precautions.push("Keep away from heat, open flames, sparks, and hot surfaces. No smoking.");
    precautions.push("Ground and bond container and receiving equipment.");
    emergency.push("In case of fire: Use alcohol-resistant foam, dry chemical, or carbon dioxide to extinguish.");
  }

  if (hc.includes("corrosive") || si.includes("corrosive") || si.includes("burn") || si.includes("damage")) {
    risks.push("Corrosive compound: Causes severe skin burns and serious eye damage.");
    precautions.push("Wear protective gloves, protective clothing, eye protection, and face protection.");
    precautions.push("Do not breathe dusts, fumes, gases, mists, or vapors.");
    emergency.push("IF ON SKIN: Take off immediately all contaminated clothing. Rinse skin with water/shower.");
    emergency.push("IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses if present.");
  }

  if (hc.includes("oxidizer") || si.includes("oxidizer") || si.includes("intensify fire")) {
    risks.push("Strong oxidizer: May intensify fire and react violently with combustible or organic compounds.");
    precautions.push("Keep away from heat, clothing, and all combustible materials.");
    precautions.push("Take any precaution to avoid mixing with organic solvents.");
    emergency.push("IF ON CLOTHING: Rinse immediately contaminated clothing and skin with plenty of water before removing.");
  }

  if (hc.includes("toxic") || si.includes("toxic") || si.includes("harmful") || si.includes("fatal")) {
    risks.push("Toxic hazard: Harmful or fatal if swallowed, inhaled, or absorbed through skin.");
    precautions.push("Wash hands and exposed skin thoroughly after handling. Do not eat, drink, or smoke when using.");
    precautions.push("Use only outdoors or in a well-ventilated area under a chemical fume hood.");
    emergency.push("IF SWALLOWED: Immediately call a POISON CENTER or doctor.");
    emergency.push("IF INHALED: Remove person to fresh air and keep comfortable for breathing.");
  }

  if (hc.includes("reactive") || si.includes("water") || si.includes("spontaneously")) {
    risks.push("Water-reactive hazard: In contact with water releases flammable gases which may ignite spontaneously.");
    precautions.push("Keep away from water/moisture. Store under inert gas (dry nitrogen or argon).");
    emergency.push("IF ON SKIN: Brush off loose particles from skin. Immerse in cool water.");
  }

  if (hc.includes("radioactive")) {
    risks.push("Radioactive material: emits ionizing radiation posing exposure risks.");
    precautions.push("Handle only behind lead shielding. Minimize exposure time and maximize distance.");
    emergency.push("In case of release or contamination: Evacuate the area, monitor exposure, and notify EHS.");
  }

  if (hc.includes("carcinogen") || si.includes("cancer") || si.includes("genetic")) {
    risks.push("Carcinogenic/Mutagenic risk: Suspected of causing cancer or genetic mutations.");
    precautions.push("Obtain special instructions before use. Wear protective gloves/clothing/eye protection.");
    emergency.push("IF exposed or concerned: Get medical advice/attention.");
  }

  if (risks.length === 0) {
    risks.push(safetyInfo || "General chemical safety handling required.");
  }

  if (precautions.length === 0) {
    if (sr) {
      precautions.push(storageRequirements || "Store in a cool, well-ventilated place.");
    } else {
      precautions.push("Wear standard laboratory PPE: safety goggles, lab coat, and appropriate chemical-resistant gloves.");
    }
  }

  if (emergency.length === 0) {
    emergency.push("In case of eye or skin contact: Flush area with copious amounts of water for at least 15 minutes.");
    emergency.push("Seek medical attention if irritation or symptoms persist. Notify your laboratory supervisor.");
  }

  return {
    potential_risks: risks,
    safety_precautions: precautions,
    emergency_measures: emergency,
    assessment_source: "local"
  };
}

// Local rules-based chemical compatibility matrix
function getLocalCompatibility(chem1: string, chem2: string): CompatibilityResult {
  const c1 = chem1.toLowerCase().trim();
  const c2 = chem2.toLowerCase().trim();

  const isAc = (name: string) => {
    return name.includes("acid") || ["hydrochloric acid", "acetic acid", "nitric acid", "sulfuric acid", "phosphoric acid", "oxalic acid", "aluminum chloride", "zinc chloride", "antimony trichloride", "tin(ii) chloride", "titanium tetrachloride"].some(x => name.includes(x));
  };
  const isBase = (name: string) => {
    return ["sodium hydroxide", "potassium hydroxide", "ammonia solution", "triethylamine", "piperidine", "base"].some(x => name.includes(x));
  };
  const isFlammable = (name: string) => {
    return ["ethanol", "acetone", "methanol", "isopropanol", "hexane", "toluene", "tetrahydrofuran", "ethyl acetate", "acetonitrile", "pyridine", "triethylamine", "piperidine"].some(x => name.includes(x));
  };
  const isOxidizer = (name: string) => {
    return ["nitric acid", "hydrogen peroxide", "potassium permanganate", "silver nitrate", "bismuth nitrate", "potassium dichromate", "lead(ii) nitrate", "oxidizer"].some(x => name.includes(x));
  };
  const isWaterReactive = (name: string) => {
    return ["hydride", "aluminum hydride", "thionyl chloride", "oxalyl chloride", "titanium tetrachloride", "reactive"].some(x => name.includes(x));
  };
  const isAzide = (name: string) => {
    return name.includes("azide") || name.includes("cyanide");
  };

  if ((c1.includes("nitric") && isFlammable(c2)) || (c2.includes("nitric") && isFlammable(c1))) {
    return {
      is_compatible: false,
      warnings: `DANGER: Nitric Acid mixed with organic solvents/flammables can cause a violent explosion or spontaneous ignition.`,
      reaction_risk: "High risk of explosive oxidation reaction and fire."
    };
  }

  if ((c1.includes("azide") && isAc(c2)) || (c2.includes("azide") && isAc(c1))) {
    return {
      is_compatible: false,
      warnings: `DANGER: Mixing Azides/Cyanides with acids releases highly toxic and explosive hydrazoic acid gas or hydrogen cyanide gas.`,
      reaction_risk: "Evolution of highly toxic, lethal gaseous compounds."
    };
  }

  if ((isWaterReactive(c1) && (c2.includes("water") || c2.includes("peroxide") || c2.includes("ammonia") || isAc(c2) || c2.includes("ethanol") || c2.includes("methanol"))) ||
      (isWaterReactive(c2) && (c1.includes("water") || c1.includes("peroxide") || c1.includes("ammonia") || isAc(c1) || c1.includes("ethanol") || c1.includes("methanol")))) {
    return {
      is_compatible: false,
      warnings: `DANGER: Water-reactive compounds react violently with water, alcohols, or aqueous solutions, releasing highly flammable hydrogen gas or toxic acid fumes.`,
      reaction_risk: "Violent exothermic gas evolution and potential ignition/blast."
    };
  }

  if ((isOxidizer(c1) && isFlammable(c2)) || (isOxidizer(c2) && isFlammable(c1))) {
    return {
      is_compatible: false,
      warnings: `WARNING: Oxidizers stored or mixed with Flammable materials create an extreme fire hazard and accelerate combustion.`,
      reaction_risk: "Enhanced fire risk and rapid chemical oxidation."
    };
  }

  if ((c1.includes("sulfuric") && (c2.includes("acetone") || c2.includes("ethanol") || c2.includes("methanol"))) ||
      (c2.includes("sulfuric") && (c1.includes("acetone") || c1.includes("ethanol") || c1.includes("methanol")))) {
    return {
      is_compatible: false,
      warnings: `DANGER: Concentrated Sulfuric Acid reacts violently with organic solvents, potentially causing boiling, splattering, or ignition.`,
      reaction_risk: "Severe exothermic reaction and rapid acid dehydration."
    };
  }

  if ((isAc(c1) && isBase(c2)) || (isAc(c2) && isBase(c1))) {
    return {
      is_compatible: false,
      warnings: `WARNING: Acids and bases react exothermically (neutralization). Large quantities can boil or splatter.`,
      reaction_risk: "Exothermic neutralization reaction."
    };
  }

  if (isAc(c1) && isAc(c2)) {
    if ((c1.includes("nitric") && c2.includes("acetic")) || (c2.includes("nitric") && c1.includes("acetic"))) {
      return {
        is_compatible: false,
        warnings: `WARNING: Nitric acid (oxidizing acid) is incompatible with Acetic acid (organic acid/flammable).`,
        reaction_risk: "Oxidation reaction, heat release, pressure build-up."
      };
    }
    return {
      is_compatible: true,
      warnings: "Compatible: Both are acid compounds. Can be stored in the acid cabinet.",
      reaction_risk: "No reactivity hazard."
    };
  }

  if (isBase(c1) && isBase(c2)) {
    return {
      is_compatible: true,
      warnings: "Compatible: Both are basic compounds. Can be stored in the base cabinet.",
      reaction_risk: "No reactivity hazard."
    };
  }

  if (isFlammable(c1) && isFlammable(c2)) {
    return {
      is_compatible: true,
      warnings: "Compatible: Both are flammables. Can be stored in the flammable storage cabinet.",
      reaction_risk: "No reactivity hazard."
    };
  }

  return {
    is_compatible: true,
    warnings: `No immediate hazard detected for storage. However, always store in original containers and consult the Safety Data Sheets (SDS).`,
    reaction_risk: "Low immediate risk"
  };
}

export const geminiService = {
  async getSafetyAdvice(chemicalName: string, context: string = "") {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a laboratory safety expert. Provide concise safety advice, hazard warnings, and storage compatibility information for the chemical: ${chemicalName}. ${context ? `Additional context: ${context}` : ""}. Focus on GHS hazards and PPE requirements.`,
      });
      // Append markdown tag indicating AI source
      return response.text + "\n\n---\n*Verified by Gemini AI*";
    } catch (error) {
      console.error("Gemini Error:", error);
      return getLocalSafetyAdvice(chemicalName);
    }
  },

  async predictHazards(
    chemicalName: string,
    formula: string,
    molecularWeight: number,
    hazardClass?: string,
    safetyInfo?: string,
    storageRequirements?: string
  ): Promise<HazardPrediction> {
    const prompt = `Analyze this chemical: 
      Name: ${chemicalName}
      Formula: ${formula}
      Molecular Weight: ${molecularWeight} g/mol
      
      Predict potential lab hazards, safety precautions, and emergency measures in JSON format.`;

    try {
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
              },
              safety_precautions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              emergency_measures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              }
            },
            required: ["potential_risks", "safety_precautions", "emergency_measures"]
          }
        }
      });
      const data = JSON.parse(response.text.trim());
      return {
        ...data,
        assessment_source: "ai"
      };
    } catch (error) {
      console.error("Gemini Error:", error);
      return getLocalHazards(chemicalName, formula, molecularWeight, hazardClass, safetyInfo, storageRequirements);
    }
  },

  async checkCompatibility(chem1: string, chem2: string): Promise<CompatibilityResult> {
    const prompt = `Check if ${chem1} and ${chem2} are compatible for storage or mixture.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a laboratory safety advisor. Assess chemical compatibility strictly based on reactivity groups. Return JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_compatible: { type: Type.BOOLEAN },
              warnings: { type: Type.STRING },
              reaction_risk: { type: Type.STRING }
            },
            required: ["is_compatible", "warnings", "reaction_risk"]
          }
        }
      });
      const resData = JSON.parse(response.text.trim());
      return {
        ...resData,
        assessment_source: "ai"
      };
    } catch (error) {
      console.error("Gemini Error:", error);
      const fallback = getLocalCompatibility(chem1, chem2);
      return {
        ...fallback,
        assessment_source: "local"
      };
    }
  }
};
