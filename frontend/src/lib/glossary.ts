// Glossaire hors-ligne fr ↔ wo pour la traduction des messages.
//
// Approche volontairement légère (aucune API, aucune dépendance) :
//  • détection de langue par mots-outils (stopwords) fréquents ;
//  • traduction par phrases, en associant chaque phrase normalisée
//    (minuscules, ponctuation ôtée, nombres → {n}) à son équivalent ;
//  • les nombres de la phrase d'origine sont réinjectés après traduction ;
//  • si moins de la moitié du message est couverte, on laisse l'original.
// À compléter au fil du temps : ajouter des paires dans PAIRS.

export type Lang = "fr" | "wo";

const FR_STOPWORDS = new Set(
  "le la les un une des de du et est je tu il elle nous vous ils elles suis es ont sont"
    .split(/\s+/)
    .concat(
      "acheter commander bonjour bonsoir boutique combien couleur disponible dispo"
        .split(/\s+/)
        .concat("livraison merci non oui prix produit produits regarde svp taille".split(/\s+/)),
    ),
);

const WO_STOPWORDS = new Set(
  "na naa ñu ak ci bi ba bo la le ye bu doo dafay dem am amul bëgg jàll jaay lu naka nanga"
    .split(/\s+/)
    .concat(
      "mangi dina wu yoow yow te du warul mel ni mu muy nii ana anu ñaata ku ne bari yóbb u"
        .split(/\s+/)
        .concat("yóbbu wàccal xaar jàmm sàlàm jar yónnee leen kenn xere".split(/\s+/)),
    ),
);

// Paires de phrases (fr → wo). Le {n} capture un nombre.
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["bonjour", "sàlàm"],
  ["bonsoir", "nog a bàyyi"],
  ["salut", "nagga def"],
  ["comment ça va", "naka nga def"],
  ["ça va bien", "mangi fi rékk"],
  ["ça va", "mangi fi rékk"],
  ["merci beaucoup", "jërëjëf fu bari"],
  ["merci", "jërëjëf"],
  ["de rien", "séluwul"],
  ["oui", "waaw"],
  ["non", "dëdët"],
  ["d'accord", "baax na"],
  ["très bien", "baax na lool"],
  ["je voudrais acheter", "bëgg naa jënd"],
  ["je veux acheter", "bëgg naa jënd"],
  ["je voudrais commander", "bëgg naa kummande"],
  ["je voudrais connaître le prix", "bëgg naa xam ñaata la jar"],
  ["quel est le prix", "ñaata la jar"],
  ["combien ça coûte", "ñaata la jar"],
  ["le prix c'est combien", "ñaata la jar"],
  ["c'est combien", "ñaata la jar"],
  ["c'est trop cher", "ci rëy na jar"],
  ["trop cher", "ci rëy na jar"],
  ["le prix est trop cher", "jàll bi ci rëy na"],
  ["pouvez-vous baisser le prix", "mën nga wàccal sa jàll"],
  ["baissez le prix", "wàccal sa jàll"],
  ["je peux baisser à {n}", "mën naa wàccal ba {n}"],
  ["est-ce disponible", "am na ne"],
  ["encore disponible", "muy am ne"],
  ["ce n'est plus disponible", "amul ne"],
  ["j'ai commandé", "kummande naa ko"],
  ["où est ma commande", "ana sa kummande bi"],
  ["j'attends la livraison", "nga di xaar yóbbu bi"],
  ["quand arrive la livraison", "kan la yóbbu bi doon"],
  ["combien pour la livraison", "ñaata yóbbu bi la jar"],
  ["la livraison est gratuite", "yóbbu bi du fay"],
  ["vous livrez", "ngeen di yóbbu"],
  ["livraison aujourd'hui", "yóbbu bés bi"],
  ["c'est urgent", "ci lëj na"],
  ["avez-vous d'autres couleurs", "am nga beneen xere"],
  ["avez-vous une autre taille", "am nga beneen suuf"],
  ["pouvez-vous m'envoyer des photos", "mën nga ma yónnee foto yi"],
  ["je regarde", "naa xodde"],
  ["je n'ai pas compris", "xàmbu ma"],
  ["pouvez-vous répéter", "mën nga ko dellu"],
  ["attendez", "xaaral"],
  ["je peux vous aider", "mën naa la dimbali"],
  ["avez-vous des questions", "am nga ay laasin"],
  ["ok je vais voir", "baax na, naa xodde"],
  ["au revoir", "ba beneen yoon"],
  ["à plus tard", "ba gannaw"],
  ["bonne journée", "bés bu baax"],
  ["demain", "eléek"],
  ["aujourd'hui", "bés bi"],
  ["combien de temps", "ñaata yoon ci jamono"],
  ["quel est ton prix", "ñaata sa jàll"],
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\d+/g, " {n} ")
    .replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function restoreNumbers(template: string, original: string): string {
  const numbers = original.match(/\d+/g) ?? [];
  let index = 0;
  return template.replace(/\{n\}/g, () => numbers[index++] ?? "");
}

export function detectLanguage(text: string | null): Lang | null {
  if (!text) return null;
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  let fr = 0;
  let wo = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (FR_STOPWORDS.has(w)) fr += 1;
    if (WO_STOPWORDS.has(w)) wo += 1;
  }
  if (fr === 0 && wo === 0) return null;
  if (fr === wo) return null;
  return wo > fr ? "wo" : "fr";
}

export type TranslationResult = {
  translated: string;
  ratio: number;
};

// Traduit un message vers la langue cible ; null si la langue source l'intéresse
// déjà, est indétectable, ou que la couverture du glossaire est trop faible.
export function translateMessage(text: string, to: Lang | string): TranslationResult | null {
  const from = detectLanguage(text);
  if (!from || from === to) return null;

  const map = from === "fr" ? frToWo : woToFr;
  const sentences = text.split(/(?<=[.!?])\s+/);
  let translated = "";
  let originalChars = 0;
  let matchedChars = 0;

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    originalChars += sentence.length;

    const key = normalize(sentence);
    const mapped = map.get(key);
    if (mapped) {
      translated += `${translated ? " " : ""}${restoreNumbers(mapped, sentence)}`;
      matchedChars += sentence.length;
    } else {
      translated += `${translated ? " " : ""}${sentence}`;
    }
  }

  if (originalChars === 0) return null;
  const ratio = matchedChars / originalChars;
  if (ratio < 0.5) return null;

  return { translated, ratio };
}

const frToWo = new Map<string, string>(PAIRS.map(([fr, wo]) => [normalize(fr), wo]));
const woToFr = new Map<string, string>(PAIRS.map(([fr, wo]) => [normalize(wo), fr]));