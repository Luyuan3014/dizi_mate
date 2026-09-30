export const KEYS = { C: 72, D: 74, E: 76, F: 77, G: 79 };

// Holes run from the mouthpiece toward the foot: 6, 5, 4, 3, 2, 1.
export const NOTES = [
  {
    id: "low5",
    number: "5",
    solfege: "sol",
    low: true,
    offset: -5,
    holes: [1, 1, 1, 1, 1, 1],
    title: "六个孔，全部盖严",
    tip: "用指肚自然盖住六个音孔。气流细一点、平稳一点，不用使劲吹。",
  },
  {
    id: "low6",
    number: "6",
    solfege: "la",
    low: true,
    offset: -3,
    holes: [1, 1, 1, 1, 1, 0],
    title: "抬起右手无名指",
    tip: "只打开最右边的第 1 孔，其余五个孔盖严。保持刚才平稳的气流。",
  },
  {
    id: "low7",
    number: "7",
    solfege: "si",
    low: true,
    offset: -1,
    holes: [1, 1, 1, 1, 0, 0],
    title: "再抬起右手中指",
    tip: "打开最右边的第 1、2 孔，其余四个孔盖严。手指不需要抬得很高。",
  },
  {
    id: "1",
    number: "1",
    solfege: "do",
    offset: 0,
    holes: [1, 1, 1, 0, 0, 0],
    title: "左手盖住，右手放开",
    tip: "靠近吹孔的三个音孔盖严，右手三个音孔打开。这就是简谱里的 do。",
  },
  {
    id: "2",
    number: "2",
    solfege: "re",
    offset: 2,
    holes: [1, 1, 0, 0, 0, 0],
    title: "抬起左手无名指",
    tip: "只盖住靠近吹孔的第 6、5 孔，其余四个孔打开。",
  },
  {
    id: "3",
    number: "3",
    solfege: "mi",
    offset: 4,
    holes: [1, 0, 0, 0, 0, 0],
    title: "只留下左手食指",
    tip: "只盖住最靠近吹孔的第 6 孔。其余手指自然放松，不要离笛身太远。",
  },
  {
    id: "4",
    number: "4",
    solfege: "fa",
    offset: 5,
    holes: [0.5, 0, 0, 0, 0, 0],
    title: "第 6 孔，打开一半",
    tip: "这是半孔指法：左手食指只盖住第 6 孔的一半。不同笛子需要微调，先练好前面的音再试。",
  },
  {
    id: "5",
    number: "5",
    solfege: "sol",
    offset: 7,
    holes: [1, 1, 1, 1, 1, 1],
    title: "相同指法，更集中的气流",
    tip: "六孔全按，收小唇间气口、集中气流，吹出高八度的 sol。初学时可先跳过。",
    overblow: true,
  },
  {
    id: "6", number: "6", solfege: "la", offset: 9,
    holes: [1, 1, 1, 1, 1, 0], overblow: true,
    title: "第 1 孔打开，集中气流",
    tip: "指法与低音 6 相同，打开第 1 孔。气口收小、气速加快，腹部平稳支持，吹出中音 6；不要靠鼓腮或猛吹提高音高。",
  },
  {
    id: "7", number: "7", solfege: "si", offset: 11,
    holes: [1, 1, 1, 1, 0, 0], overblow: true,
    title: "第 1、2 孔打开，保持急吹",
    tip: "指法与低音 7 相同，打开第 1、2 孔。保持细而集中的气束和稳定支撑，不要在换指时突然松掉气息。",
  },
  {
    id: "high1", number: "1", solfege: "do", offset: 12, high: true,
    holes: [1, 1, 1, 0, 0, 0], overblow: true,
    title: "左手三孔盖严，急吹高音 do",
    tip: "与中音 1 同指法，右手三孔全开。缩小风门、适度加快气流，稳定地超吹到高八度；喉咙放松，避免挤压。",
  },
  {
    id: "high2", number: "2", solfege: "re", offset: 14, high: true,
    holes: [1, 1, 0, 0, 0, 0], overblow: true,
    title: "只按第 6、5 孔，急吹高音 re",
    tip: "与中音 2 同指法。高音 1 的集中气束不要断，轻抬左手无名指；气流细、快而稳，注意第 6、5 孔不漏气。",
  },
  {
    id: "high3", number: "3", solfege: "mi", offset: 16, high: true,
    holes: [1, 0, 0, 0, 0, 0], overblow: true,
    title: "只按第 6 孔，急吹高音 mi",
    tip: "与中音 3 同指法，仅左手食指盖住第 6 孔。气口更集中，腹部维持均匀支撑；若声音发尖，略放松气速并微调吹角。",
  },
  {
    id: "high4", number: "4", solfege: "fa", offset: 17, high: true,
    holes: [0, 1, 1, 1, 1, 0], overblow: true,
    title: "打开第 6、1 孔，叉口急吹",
    tip: "常用叉口指法：打开第 6、1 孔，盖严第 5、4、3、2 孔。用细而快的气束急吹，配合吹角校准音高。高音叉口对笛子开孔与气息较敏感。",
  },
  {
    id: "high5", number: "5", solfege: "sol", offset: 19, high: true,
    holes: [0, 1, 1, 1, 1, 1], overblow: true,
    title: "打开第 6 孔，其余五孔盖严",
    tip: "用第 6 孔作泛音泄孔，其余五孔盖严。风门小、气速快，气息持续支持，急吹高音 5；先听参考音，避免落回中音 5。",
  },
  {
    id: "high6", number: "6", solfege: "la", offset: 21, high: true,
    holes: [1, 1, 0, 1, 1, 0], overblow: true,
    title: "打开第 4、1 孔，叉口急吹",
    tip: "常用叉口指法：第 6、5、3、2 孔盖严，第 4、1 孔打开。用很细、很集中的快速气束，保持腹部支撑。不同竹笛可能需要替代指法与吹角微调，不必强求大音量。",
  },
];

export const noteLabel = (note) => `${note.low ? "低音" : note.high ? "高音" : "中音"} ${note.number}`;

export const LESSONS = [
  {
    id: "first",
    name: "吹响第一个音",
    subtitle: "先不着急，稳稳吹出一声",
    duration: "约 3 分钟",
    sequence: ["low5"],
    instruction: "从全按的低音 5 开始，感受气息经过竹笛。",
    stage: "入门长音",
  },
  {
    id: "steps",
    name: "认识三个音",
    subtitle: "动动手指，听见音高的变化",
    duration: "约 5 分钟",
    sequence: ["low5", "low6", "low7"],
    instruction: "一次只抬起一根手指，试试 sol、la、si。",
    stage: "指法小练习",
  },
  {
    id: "song",
    name: "吹一段小旋律",
    subtitle: "你的第一首《两只老虎》",
    duration: "约 5 分钟",
    sequence: ["1", "2", "3", "1", "1", "2", "3", "1"],
    instruction: "《两只老虎》开头两句，每个数字吹一拍。",
    stage: "旋律练习",
  },
];

export function frequencyFor(note, key = "E", reference = 440) {
  return reference * 2 ** ((KEYS[key] + note.offset - 69) / 12);
}

export function centsBetween(frequency, target) {
  return 1200 * Math.log2(frequency / target);
}

export function describePitch(cents, tolerance = 35) {
  if (Math.abs(cents) <= tolerance)
    return {
      kind: "good",
      title: "就是这个音，保持住",
      detail: "气息很接近目标，继续平稳地吹。",
    };
  if (Math.abs(cents) > 950)
    return {
      kind: "far",
      title: "试着换一个音区",
      detail:
        cents > 0
          ? "声音高了一个音区左右，试着放松、减缓气流。"
          : "声音低了一个音区左右，试着收小气口、集中气流。",
    };
  if (Math.abs(cents) > 150)
    return {
      kind: "far",
      title: "先检查一下指法",
      detail: "确认音孔盖严、笛子调性设置正确，再轻轻试一次。",
    };
  return cents > 0
    ? {
        kind: "high",
        title: "稍微高了一点",
        detail: "试着放松一些，轻轻减缓气流。",
      }
    : {
        kind: "low",
        title: "稍微低了一点",
        detail: "先检查是否漏孔，再把气流集中一点。",
      };
}

export function nearestNote(frequency, key, reference) {
  return NOTES.reduce((closest, note) =>
    Math.abs(centsBetween(frequency, frequencyFor(note, key, reference))) <
    Math.abs(centsBetween(frequency, frequencyFor(closest, key, reference)))
      ? note
      : closest,
  );
}

export function readSaved(storage) {
  const defaults = { key: "E", reference: 440, tolerance: 35, sessions: [] };
  try {
    const saved = JSON.parse(storage.getItem("dizimate-v1"));
    if (!saved || typeof saved !== "object") return defaults;
    return {
      key: Object.hasOwn(KEYS, saved.key) ? saved.key : "E",
      reference:
        Number.isFinite(saved.reference) &&
        saved.reference >= 430 &&
        saved.reference <= 450
          ? saved.reference
          : 440,
      tolerance: [20, 35, 50].includes(saved.tolerance) ? saved.tolerance : 35,
      sessions: Array.isArray(saved.sessions)
        ? saved.sessions
            .filter(
              (s) =>
                s &&
                Number.isFinite(s.at) &&
                Number.isFinite(s.seconds) &&
                s.seconds >= 0 &&
                Array.isArray(s.notes),
            )
            .map((s) => ({
              at: s.at,
              seconds: Math.min(s.seconds, 86400),
              notes: s.notes.filter((id) => NOTES.some((n) => n.id === id)),
            }))
            .slice(-100)
        : [],
    };
  } catch {
    return defaults;
  }
}

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function pitchNameFor(note, key = "E") {
  if (!note || typeof note.offset !== "number") return "";
  const midi = (KEYS[key] || 76) + note.offset;
  const name = PITCH_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return name + octave;
}

export function noteForHoles(holes, preferOverblow = false, preferHigh = false) {
  if (!Array.isArray(holes) || holes.length !== 6) return null;
  const matches = NOTES.filter((n) =>
    n.holes.every((h, i) => Math.abs(h - (holes[i] ?? 0)) < 0.2),
  );
  if (!matches.length) return null;
  if (matches.length === 1) return matches[0];
  if (preferHigh && matches.some((note) => note.high)) return matches.find((note) => note.high);
  return preferOverblow
    ? matches.find((n) => n.overblow) || matches[0]
    : matches.find((n) => !n.overblow) || matches[0];
}
