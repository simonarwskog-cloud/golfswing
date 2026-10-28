// AI-tränarens texter: fel, beröm, övningar och meddelanden. Allt som användaren läser finns här.
import { TORSO_CM } from './analysis.js';

const cm = v => Math.round(Math.abs(v) * TORSO_CM);
const dec = v => v.toFixed(1).replace('.', ',');

// Ord som beror på om man slår höger- eller vänsterhänt
export function sides(righty) {
  return righty === false
    ? { lead: 'höger', trail: 'vänster', slice: 'vänster', hook: 'höger' }
    : { lead: 'vänster', trail: 'höger', slice: 'höger', hook: 'vänster' };
}

// Varje fel: rubrik, enkel förklaring, detalj med mätvärde och vilken övning som hjälper
export const FAULTS = {
  tempo_fast: {
    title: 'För snabb baksving',
    simple: () => 'Du drar upp klubban för fort. Ta det lugnt på vägen upp – farten ska komma på vägen ner.',
    detail: ({ v }) => `Ditt tempo är ${dec(v)} : 1. Hos proffs tar baksvingen ungefär tre gånger så lång tid som nedsvingen (3 : 1).`,
    drill: 'tempo123',
  },
  tempo_slow: {
    title: 'Långsam nedsving',
    simple: () => 'Din baksving är lugn och fin, men du bromsar på vägen ner. Våga låta klubban gå!',
    detail: ({ v }) => `Ditt tempo är ${dec(v)} : 1. Proffs ligger nära 3 : 1.`,
    drill: 'swoosh',
  },
  head_sway: {
    title: 'Huvudet rör sig i sidled',
    simple: () => 'Ditt huvud flyttar sig mycket åt sidan under svingen. Försök hålla huvudet ungefär på samma ställe – då träffar du bollen jämnare.',
    detail: ({ v }) => `Huvudet flyttade sig ca ${cm(v)} cm i sidled.`,
    drill: 'shadow',
  },
  head_ahead: {
    title: 'Huvudet glider före bollen',
    simple: () => 'När du träffar bollen har huvudet glidit fram mot målet. Låt huvudet stanna bakom bollen tills du har träffat.',
    detail: ({ v }) => `Huvudet var ca ${cm(v)} cm närmare målet i träffen än i uppställningen.`,
    drill: 'headbehind',
  },
  head_rise: {
    title: 'Du reser dig i träffen',
    simple: () => 'Du rätar på dig på vägen ner, så huvudet åker upp. Stanna kvar i din böjda position tills bollen är iväg.',
    detail: ({ v }) => `Huvudet var ca ${cm(v)} cm högre i träffen än i uppställningen.`,
    drill: 'wall',
  },
  head_dip: {
    title: 'Du sjunker ihop',
    simple: () => 'Huvudet åker ner under svingen. Försök att stå lika lång hela vägen.',
    detail: ({ v }) => `Huvudet var ca ${cm(v)} cm lägre i träffen än i uppställningen.`,
    drill: 'standtall',
  },
  hip_sway: {
    title: 'Höfterna glider åt sidan',
    simple: ({ s }) => `I baksvingen glider höfterna åt ${s.trail}. Vrid i stället höfterna – som om du står i en tunna.`,
    detail: ({ v }) => `Höfterna gled ca ${cm(v)} cm åt sidan.`,
    drill: 'hipstick',
  },
  weight_back: {
    title: 'Vikten stannar på bakre foten',
    simple: ({ s }) => `I avslutet står du kvar med vikten bak. I ett bra avslut står nästan all vikt på ${s.lead} fot och magen pekar mot målet.`,
    detail: ({ v }) => `Ungefär ${Math.round(Math.max(0, Math.min(1, v)) * 100)} % av vägen över till främre foten.`,
    drill: 'stepthrough',
  },
  over_the_top: {
    title: 'Svingen kommer utifrån',
    simple: ({ s }) => `På vägen ner rör sig händerna ut mot bollen i stället för att falla ner innanför. Det ger ofta slice – bollen svänger åt ${s.slice}.`,
    detail: ({ v }) => `Händerna var ca ${cm(v)} cm längre ut på vägen ner än på vägen upp ("över toppen").`,
    drill: 'headcover',
  },
  too_inside: {
    title: 'Svingen kommer för mycket inifrån',
    simple: ({ s }) => `Händerna faller långt in bakom dig på vägen ner. Det kan ge bollar som går rakt åt ${s.slice} eller svänger kraftigt åt ${s.hook}.`,
    detail: ({ v }) => `Händerna var ca ${cm(v)} cm längre in på vägen ner än på vägen upp.`,
    drill: 'insideblock',
  },
  early_ext: {
    title: 'Höfterna går mot bollen',
    simple: () => 'På vägen ner skjuter du höfterna fram mot bollen och reser dig. Då blir det svårt att träffa rent. Håll rumpan kvar bakåt.',
    detail: ({ v }) => `Höfterna rörde sig ca ${cm(v)} cm mot bollen.`,
    drill: 'wall',
  },
  posture_loss: {
    title: 'Du tappar din framåtböjning',
    simple: () => 'Du rätar på överkroppen innan du har träffat bollen. Försök behålla vinkeln från uppställningen.',
    detail: ({ v }) => `Framåtböjningen minskade med ${Math.round(v)}° till träffen.`,
    drill: 'wall',
  },
  posture_upright: {
    title: 'För upprätt uppställning',
    simple: () => 'Du står för rak när du ställer upp. Böj dig fram från höfterna så att armarna hänger rakt ner.',
    detail: ({ v }) => `Din framåtböjning är ${Math.round(v)}°.`,
    drill: 'mirror',
  },
  posture_bent: {
    title: 'För hopsjunken uppställning',
    simple: () => 'Du böjer dig för mycket när du ställer upp. Res dig lite och håll ryggen rak.',
    detail: ({ v }) => `Din framåtböjning är ${Math.round(v)}°.`,
    drill: 'mirror',
  },
  head_forward: {
    title: 'Huvudet går mot bollen',
    simple: () => 'Huvudet rör sig fram mot bollen på vägen ner. Försök hålla huvudet still.',
    detail: ({ v }) => `Huvudet rörde sig ca ${cm(v)} cm mot bollen.`,
    drill: 'wall',
  },
};

export const GOOD = {
  tempo: 'Bra tempo – lugn baksving och fart på vägen ner, precis som proffsen.',
  head: 'Du håller huvudet stilla. Det ger en jämn träff.',
  height: 'Du håller samma höjd genom svingen.',
  hips: 'Fin höftvridning utan att glida åt sidan.',
  weight: 'Bra viktförflyttning – du avslutar på främre foten.',
  posture: 'Bra hållning i uppställningen.',
  keep: 'Du behåller din framåtböjning genom träffen.',
  path: 'Bra svingbana – klubban kommer inifrån mot bollen.',
};

export const DRILLS = {
  tempo123: {
    title: 'Tempo 1-2-3', why: 'Ger en lugn baksving och bra rytm.', reps: '2 × 10 svingar',
    steps: ['Ställ upp som vanligt, gärna utan boll först.', 'Säg tyst "ett – två – tre" medan du svingar upp.', 'Säg "fyra" när du slår igenom.', 'Gör 10 svingar, sedan 10 slag med boll.'],
  },
  swoosh: {
    title: 'Swisch-övningen', why: 'Lär dig att ge fart på vägen ner.', reps: '10 svingar',
    steps: ['Vänd klubban upp och ner och håll strax under klubbhuvudet.', 'Sving och lyssna efter ett "swisch".', 'Ljudet ska höras där bollen ligger eller framför – inte bakom.', 'Gör 10 svingar.'],
  },
  shadow: {
    title: 'Skuggövningen', why: 'Hjälper dig att hålla huvudet stilla.', reps: '10 svingar',
    steps: ['Ställ dig med solen i ryggen så att du ser din skugga.', 'Lägg en peg på marken vid skuggan av ditt huvud.', 'Sving långsamt – huvudets skugga ska stanna nära pegen.', 'Inomhus: gör samma sak framför en spegel.'],
  },
  headbehind: {
    title: 'Huvudet bakom bollen', why: 'Ger bättre träff och högre bollbana.', reps: '15 slag',
    steps: ['Lägg en peg på marken ca 10 cm framför bollen (mot målet).', 'Slå halva slag.', 'Huvudet ska vara bakom bollen när du träffar – titta på bollens baksida.', 'När det känns bra: slå hela slag.'],
  },
  wall: {
    title: 'Rumpan mot väggen', why: 'Lär dig stanna kvar i din böjda position.', reps: '2 × 10 svingar',
    steps: ['Ställ upp med rumpan precis mot en vägg (eller en stol bakom dig).', 'Gör långsamma svingar utan boll.', 'Rumpan ska ha kontakt med väggen hela vägen ner till träffen.', 'Gör sedan samma rörelse med boll.'],
  },
  standtall: {
    title: 'Stå lika lång', why: 'Jämnare träff när du inte sjunker ihop.', reps: '15 slag',
    steps: ['Ställ upp och känn hur lång du är.', 'Slå halva slag och håll samma höjd hela tiden.', 'Tänk "lång" genom hela svingen.', 'Be gärna någon titta på ditt huvud.'],
  },
  hipstick: {
    title: 'Klubban vid höften', why: 'Lär dig vrida höfterna i stället för att glida.', reps: '10 svingar',
    steps: ['Stick ner en klubba eller ett paraply i marken precis utanför din bakre höft.', 'Sving upp långsamt.', 'Höften ska vrida sig – inte stöta i klubban.', 'Gör 10 svingar, sedan slag med boll.'],
  },
  stepthrough: {
    title: 'Gå-igenom-övningen', why: 'Lär dig flytta vikten till främre foten.', reps: '10 slag',
    steps: ['Slå ett lugnt slag.', 'Direkt efter träffen: kliv fram med bakre foten mot målet, som när du börjar gå.', 'Det gör att vikten följer med framåt.', 'Gör 10 slag.'],
  },
  finish3: {
    title: 'Håll avslutet', why: 'Ger bra balans och viktförflyttning.', reps: '10 slag',
    steps: ['Slå ett lugnt slag.', 'Stå kvar i avslutet och räkna till tre.', 'Nästan all vikt ska vara på främre foten och magen ska peka mot målet.', 'Tappar du balansen – sving lite lugnare.'],
  },
  headcover: {
    title: 'Headcover-övningen', why: 'Får svingen att komma inifrån – mindre slice.', reps: '15 slag',
    steps: ['Lägg ett headcover eller en handduk ca 10 cm utanför bollen och lite bakom den.', 'Slå bollen utan att träffa headcovern.', 'Börja med halva slag.', 'Klarar du 10 i rad – flytta headcovern lite närmare.'],
  },
  insideblock: {
    title: 'Innanför-hindret', why: 'Stoppar svingen från att komma för mycket inifrån.', reps: '15 slag',
    steps: ['Lägg ett headcover ca 10 cm innanför bollen och lite bakom den (närmare dig).', 'Slå bollen utan att träffa headcovern.', 'Känn att klubban kommer mer rakt bakifrån.', 'Börja med halva slag.'],
  },
  mirror: {
    title: 'Uppställning i spegeln', why: 'Bra hållning gör hela svingen lättare.', reps: '5 gånger',
    steps: ['Ställ dig från sidan framför en spegel med en klubba.', 'Böj dig fram från höfterna – håll ryggen rak.', 'Böj knäna lite och låt armarna hänga rakt ner.', 'Håll positionen i 5 sekunder. Upprepa.'],
  },
};

// För varje fel, förklarat så att vem som helst förstår:
// what = vad du gör nu, why = varför det är dåligt, steps = så rättar du det steg för steg,
// feel = hur det ska kännas, check = så vet du att det blev rätt, look = vad du ser i jämförelsen med gubben.
// Texter kan vara funktioner ({ s }) => … när de beror på om man är höger- eller vänsterhänt.
export const CHANGES = {
  tempo_fast: {
    phase: 'top',
    what: 'Du drar upp klubban för snabbt. Svingen blir ryckig och kroppen hinner inte vrida sig klart.',
    why: 'När baksvingen går för fort tappar du rytmen. Då blir träffen ojämn – ibland bra, ibland dålig.',
    steps: ['Ställ upp som vanligt.', 'Dra upp klubban lugnt medan du säger "ett – två – tre" i huvudet.', 'Säg "fyra" när du slår mot bollen – det är där farten ska komma.', 'Gör 10 svingar utan boll, sedan 10 med boll.'],
    feel: 'Som när du kastar en boll: du tar sats lugnt bakåt och kastar sedan med full kraft.',
    check: 'Filma igen: tempot i appen ska vara nära 3 : 1.',
    look: 'Tryck på play: ni träffar bollen samtidigt, men du är uppe i toppen före gubben.',
  },
  tempo_slow: {
    phase: 'top',
    what: 'Din baksving är lugn, men på vägen ner bromsar du i stället för att öka farten.',
    why: 'Bollen flyger bara långt om klubban har full fart när den träffar bollen.',
    steps: ['Behåll din lugna baksving.', 'Vänd klubban upp och ner och håll i den tunna delen.', 'Sving och lyssna efter ett "swisch" – det ska höras där bollen ligger.', 'Gör 10 svingar och slå sedan med klubban som vanligt.'],
    feel: 'Klubban ska vara som snabbast precis vid bollen – inte innan.',
    check: 'Swischet hörs vid bollen eller framför den, inte bakom.',
    look: 'Tryck på play: gubben är uppe i toppen före dig och har mer fart på vägen ner.',
  },
  head_sway: {
    phase: 'top',
    what: 'Ditt huvud flyttar sig åt sidan när du svingar.',
    why: 'När huvudet flyttar sig flyttar sig också svingens botten. Då slår du ibland i marken före bollen och ibland på bollens topp.',
    steps: ['Ställ upp och titta på bollens baksida.', 'Sving upp långsamt och håll huvudet där det är.', 'Låt axlarna vrida sig under hakan – huvudet följer inte med.', 'Öka farten lite i taget.'],
    feel: 'Som om huvudet satt fast i en stång – kroppen vrider sig runt den.',
    check: 'Be någon hålla handen nära ditt huvud när du svingar. Du ska inte nudda den.',
    look: 'Gubbens huvud stannar nästan helt still. Ditt flyttar sig åt sidan.',
  },
  head_ahead: {
    phase: 'impact',
    what: 'När du träffar bollen har huvudet glidit fram, förbi bollen, mot målet.',
    why: 'Då kommer klubban ner för brant och bollen går lågt och kort.',
    steps: ['Lägg en peg på marken 10 cm framför bollen (mot målet).', 'Slå lugna halvslag.', 'Håll huvudet bakom bollen tills bollen är iväg.', 'Titta på bollens baksida hela tiden.'],
    feel: 'Kroppen går mot målet, men huvudet stannar kvar och "tittar efter" bollen.',
    check: 'När du träffar ska huvudet vara bakom både pegen och bollen.',
    look: 'I träffen är gubbens huvud bakom bollen. Ditt har glidit fram mot målet.',
  },
  head_rise: {
    phase: 'impact',
    what: 'Du rätar på dig på vägen ner, så huvudet åker upp innan du träffar bollen.',
    why: 'När du reser dig lyfts klubban också. Då träffar du lätt bollens topp.',
    steps: ['Ställ upp med lätt böjda knän och böj fram från höfterna.', 'Sving långsamt och behåll samma böjning hela vägen ner.', 'Res dig först när bollen redan är iväg.', 'Börja med halva svingar.'],
    feel: 'Som om en hand höll emot ditt huvud – du får inte resa dig förrän efter träffen.',
    check: 'I appen: huvudet ska vara på samma höjd i "Träff" som i "Start".',
    look: 'I träffen är gubben lika böjd som i starten. Du har rest dig.',
  },
  head_dip: {
    phase: 'impact',
    what: 'Du sjunker ihop när du svingar, så huvudet åker ner.',
    why: 'När du sjunker ner slår klubban i marken före bollen – ett "tjockt" slag.',
    steps: ['Ställ upp och känn hur lång du är.', 'Slå halva slag och håll samma höjd hela tiden.', 'Böj inte knäna mer på vägen ner.'],
    feel: 'Du är lika lång genom hela svingen.',
    check: 'I appen: huvudet ska vara på samma höjd i "Träff" som i "Start".',
    look: 'Gubbens huvud har samma höjd i träffen som i starten. Ditt har sjunkit.',
  },
  hip_sway: {
    phase: 'top',
    what: ({ s }) => `I baksvingen glider dina höfter åt sidan (åt ${s.trail}) i stället för att vrida sig.`,
    why: 'Kraften i svingen kommer från vridningen. Glider du åt sidan tappar du kraft och träffar ojämnt.',
    steps: ['Stick ner en klubba i marken precis utanför din bakre höft.', 'Sving upp långsamt.', 'Vrid höften bakåt – den får inte stöta i klubban.', 'Gör 10 svingar och slå sedan bollar.'],
    feel: 'Som att stå i en tunna: du kan vrida dig, men inte gå åt sidan.',
    check: ({ s }) => `I toppen ska vikten kännas på insidan av ${s.trail} fot – inte på utsidan.`,
    look: 'I toppen har gubbens höfter vridit sig på plats. Dina har glidit åt sidan.',
  },
  weight_back: {
    phase: 'finish',
    what: 'När svingen är klar står du kvar med vikten på bakre foten.',
    why: 'Bra spelare flyttar vikten framåt genom bollen. Stannar du bak blir slagen svaga, ofta höga och korta.',
    steps: ({ s }) => [`Slå ett lugnt slag och avsluta med nästan all vikt på ${s.lead} fot.`, 'Vänd magen mot målet.', 'Låt bakre foten snurra upp på tå.', 'Stå kvar och räkna till tre.'],
    feel: 'Som att börja gå framåt efter slaget – kroppen följer med bollen.',
    check: 'Kan du lyfta bakre foten i avslutet utan att ramla har du flyttat vikten.',
    look: 'Gubben avslutar på främre foten med bakre foten på tå. Du står kvar bak.',
  },
  over_the_top: {
    phase: 'down',
    what: 'När du börjar svinga ner rör sig händerna ut mot bollen i stället för att falla rakt ner. Klubban kommer då "utifrån".',
    why: ({ s }) => `Klubban går snett över bollen. Det ger skruv så att bollen svänger åt ${s.slice} (slice).`,
    steps: ['Sving upp till toppen och stanna en sekund.', 'Börja svinga ner genom att vrida höfterna mot målet – armarna väntar.', 'Låt händerna falla rakt ner mot bakre byxfickan.', 'Slå lugna halvslag och öka farten först när det känns rätt.'],
    feel: ({ s }) => `Tänk att du slår bollen lite inifrån, ut mot ${s.slice}kanten av fairway.`,
    check: 'I appen: din blå linje (på väg ner) ska ligga innanför eller på den gula (på väg upp).',
    look: 'Gubbens blå linje (på väg ner) går innanför den gula (på väg upp). Din blå går utanför.',
  },
  too_inside: {
    phase: 'down',
    what: 'På vägen ner faller händerna långt in bakom dig.',
    why: ({ s }) => `Klubban kommer för mycket inifrån. Bollen kan gå rakt åt ${s.slice} eller svänga kraftigt åt ${s.hook}.`,
    steps: ['Sving upp lugnt.', 'På vägen ner: låt händerna komma ner framför bröstet.', 'Vrid bröstet mot målet genom träffen.', 'Slå halvslag mot ett mål rakt fram.'],
    feel: 'Klubban kommer rakt bakifrån mot bollen.',
    check: 'I appen: den blå linjen ska ligga nära den gula, inte långt innanför.',
    look: 'Gubbens blå linje ligger nära den gula. Din går långt innanför.',
  },
  early_ext: {
    phase: 'impact',
    what: 'På vägen ner skjuter du höfterna fram mot bollen och rätar på dig.',
    why: 'Då kommer du för nära bollen och armarna får inte plats. Det ger ofta snedträffar.',
    steps: ['Ställ upp med rumpan precis mot en vägg (eller en stol bakom dig).', 'Sving långsamt utan boll.', 'Rumpan ska nudda väggen hela vägen ner till träffen.', 'Gör samma rörelse med boll.'],
    feel: 'Rumpan går bakåt och vrider sig – den går aldrig fram mot bollen.',
    check: 'I appen: höfterna ska inte vara närmare bollen i "Träff" än i "Start".',
    look: 'Gubbens höfter vrider sig utan att gå fram mot bollen. Dina går fram.',
  },
  posture_loss: {
    phase: 'impact',
    what: 'Du rätar på överkroppen innan du har träffat bollen.',
    why: 'När du reser dig ändras avståndet till bollen. Då blir träffen ojämn.',
    steps: ['Ställ upp och böj fram från höfterna.', 'Sving långsamt och låt bröstet peka mot bollen.', 'Res dig först i avslutet.', 'Börja med halva svingar.'],
    feel: 'Bröstet "tittar" på bollen ända tills du har träffat.',
    check: 'I appen: din lutning i "Träff" ska vara nästan samma som i "Start".',
    look: 'I träffen lutar gubben fram lika mycket som i starten. Du har rätat på dig.',
  },
  posture_upright: {
    phase: 'address',
    what: 'Du står för rak när du ställer upp.',
    why: 'Står du rak får armarna ingen plats att svinga. Då kommer svingen lätt utifrån eller blir för platt.',
    steps: ['Stå rak med klubban framför dig.', 'Skjut rumpan bakåt så att du böjer dig fram från höfterna – håll ryggen rak.', 'Böj knäna lite.', 'Låt armarna hänga rakt ner under axlarna.'],
    feel: 'Som när du ska sätta dig på en hög barstol.',
    check: 'Titta i en spegel från sidan: axlarna ska vara ovanför tårna och armarna hänga rakt ner.',
    look: 'Gubben böjer sig fram från höfterna så att armarna hänger rakt ner. Du står rakare.',
  },
  posture_bent: {
    phase: 'address',
    what: 'Du böjer dig för mycket när du ställer upp.',
    why: 'Med för mycket böj blir det svårt att vrida kroppen.',
    steps: ['Res dig lite.', 'Håll ryggen rak och bröstet uppe.', 'Böj knäna bara lite.', 'Låt armarna hänga rakt ner.'],
    feel: 'Stolt hållning – som om någon drog dig uppåt i nacken.',
    check: 'Titta i en spegel från sidan: ryggen ska vara rak, inte rund.',
    look: 'Gubben har rak rygg i starten. Du böjer dig mer.',
  },
  head_forward: {
    phase: 'impact',
    what: 'På vägen ner rör sig huvudet fram mot bollen.',
    why: 'Då kommer du för nära bollen och träffar lätt med fel del av klubban.',
    steps: ['Ställ upp och titta på bollen.', 'Sving långsamt och håll huvudet still.', 'Låt kroppen vrida sig – luta dig inte fram.'],
    feel: 'Huvudet stannar på samma ställe – resten av kroppen gör jobbet.',
    check: 'I appen: huvudet ska vara på samma ställe i "Träff" som i "Start".',
    look: 'Gubbens huvud är kvar där det var i starten. Ditt har gått fram mot bollen.',
  },
};

// Hämtar en text som kan vara en funktion av höger-/vänsterhänt
export const say = (text, c) => (typeof text === 'function' ? text(c) : text);

export const PHASE_NAMES = { address: 'Start', top: 'Toppen', down: 'Nedsving', impact: 'Träff', finish: 'Avslut' };

// Vad den perfekta svingen gör i varje del
export const PHASE_TIPS = {
  address: ['Böj från höfterna med rak rygg', 'Knäna lätt böjda', 'Armarna hänger rakt ner'],
  top: ['Axlarna har vridit ett kvarts varv', 'Höfterna har vridit ungefär hälften så mycket', 'Klubban pekar mot målet'],
  down: ['Höfterna börjar vrida mot målet', 'Händerna faller ner innanför', 'Huvudet är stilla'],
  impact: ['Höfterna är öppna mot målet', 'Händerna är lite före bollen', 'Huvudet är bakom bollen'],
  finish: ['Magen pekar mot målet', 'Vikten är på främre foten', 'Bakre foten står på tå'],
};

// Grundövningar när vi inte hittat några fel än
export const BASICS = ['tempo123', 'finish3', 'mirror'];

export function scoreLabel(score) {
  if (score >= 90) return 'Proffsnivå';
  if (score >= 80) return 'Riktigt bra – små saker kvar';
  if (score >= 70) return 'Bra grund – men tydliga fel';
  if (score >= 55) return 'Flera saker att träna på';
  return 'Mycket att vinna – börja med nummer 1';
}

// Tränarens meddelande utifrån historiken (nyast först)
export function coachMessage(history) {
  if (!history.length) return 'Filma din första sving så hjälper jag dig att bli bättre!';
  const last = history[0];
  const prev = history.slice(1).find(h => h.view === last.view);
  if (!prev) return `Din svingpoäng är ${last.score}. Gör övningen i Träning några gånger och filma sedan igen.`;

  const diff = last.score - prev.score;
  const fixed = prev.faults.find(f => !last.faults.some(g => g.id === f.id));
  const recent = history.filter(h => h.view === last.view).slice(0, 3);
  const stuck = recent.length === 3 && last.faults.find(f => recent.every(h => h.faults.some(g => g.id === f.id)));

  if (fixed && diff >= 0) return `Snyggt jobbat! "${FAULTS[fixed.id].title}" syns inte längre i din sving.`;
  if (diff > 0) return `Det går framåt! Din poäng gick upp från ${prev.score} till ${last.score}.`;
  if (stuck) return `"${FAULTS[stuck.id].title}" har kommit tillbaka flera gånger. Gör övningen "${DRILLS[FAULTS[stuck.id].drill].title}" några dagar i rad.`;
  if (diff < 0) return `Poängen gick ner lite (${prev.score} → ${last.score}). Det är helt normalt – fortsätt träna, så kommer det!`;
  return `Du ligger stabilt på ${last.score} poäng. Fokusera på en sak i taget.`;
}

// Träningsplan: övningarna för de fel som syns mest i de senaste svingarna
export function planFor(history) {
  const weight = {};
  for (const h of history.slice(0, 5)) {
    for (const f of h.faults) {
      const d = FAULTS[f.id]?.drill;
      if (d) weight[d] = (weight[d] || 0) + f.severity;
    }
  }
  const drills = Object.keys(weight).sort((x, y) => weight[y] - weight[x]).slice(0, 3);
  const personal = drills.length > 0;
  for (const b of BASICS) if (drills.length < 3 && !drills.includes(b)) drills.push(b);
  return { personal, drills };
}
