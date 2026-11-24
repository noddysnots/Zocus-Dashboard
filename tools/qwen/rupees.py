"""Read rupee amounts out of Hindi / Gujarati / English number words (and digits), so a price in the facts is checked by code, not trusted from the model."""
import re
HI = "एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चौवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे".split()
HI_ALT = {"अठ्ठाईस": 28, "अट्ठाइस": 28, "अठ्ठावन": 58, "पांच": 5, "छः": 6, "छे": 6, "छ": 6, "पन्द्रह": 15, "अठाईस": 28, "अठावीस": 28, "बियालीस": 42, "ढाई": 2.5, "अढ़ी": 2.5, "अढी": 2.5, "डेढ़": 1.5, "डेढ": 1.5, "नो": 9, "दो": 2, "पैतालीस": 45, "पेंतालीस": 45, "तीस": 30, "बिस": 20, "सैंतालीस": 47}
GU = "એક બે ત્રણ ચાર પાંચ છ સાત આઠ નવ દસ અગિયાર બાર તેર ચૌદ પંદર સોળ સત્તર અઢાર ઓગણીસ વીસ એકવીસ બાવીસ ત્રેવીસ ચોવીસ પચીસ છવ્વીસ સત્તાવીસ અઠ્ઠાવીસ ઓગણત્રીસ ત્રીસ એકત્રીસ બત્રીસ તેત્રીસ ચોત્રીસ પાંત્રીસ છત્રીસ સાડત્રીસ અડત્રીસ ઓગણચાલીસ ચાલીસ".split()
GU_ALT = {"અઠ્યાવીસ": 28, "અઠાવીસ": 28, "અઢી": 2.5, "દોઢ": 1.5, "બીસ": 20, "તીસ": 30, "પચાસ": 50, "સાઠ": 60, "સિત્તેર": 70, "એંસી": 80, "નેવું": 90, "પેન્તાલીસ": 45, "પિસ્તાલીસ": 45, "પંદ્રહ": 15, "પાંચસો": 500, "પાંચ": 5, "સત્તર": 17}
EN = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split())}
EN.update({"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90})
NUM = {}
for i, w in enumerate(HI, 1): NUM[w] = i
for i, w in enumerate(GU, 1): NUM.setdefault(w, i)
NUM.update(HI_ALT); NUM.update(GU_ALT); NUM.update(EN)
HUND = {"सौ", "सो", "सौं", "hundred", "સો", "સૌ", "सै"}
UNIT = {"हज़ार": 1e3, "हजार": 1e3, "हज़ारों": 1e3, "thousand": 1e3, "k": 1e3, "હજાર": 1e3, "हजा": 1e3, "लाख": 1e5, "lakh": 1e5, "lac": 1e5, "lakhs": 1e5, "લાખ": 1e5, "लाख़": 1e5, "करोड़": 1e7, "crore": 1e7, "કરોડ": 1e7}
TOK = re.compile(r"\d[\d,]*(?:\.\d+)?|[^\W\d_]+(?:[ऀ-ॿ઀-૿़्ँ-ःा-ौ]*)", re.U)


def amounts(text):
    """Return rupee amounts found in the text. Units (हज़ार, लाख, lakh, thousand, crore) are required unless the number is written with digits and is 4+ digits."""
    toks = [t.lower() for t in TOK.findall(text or "")]
    out, i = [], 0
    while i < len(toks):
        cur, total, seen, j = 0, 0.0, False, i
        used_unit = False
        while j < len(toks):
            t = toks[j]
            if re.fullmatch(r"\d[\d,]*(?:\.\d+)?", t):
                v = float(t.replace(",", "")); cur = cur + v if cur and v < 100 and cur < 100 else v; seen = True
            elif t in NUM:
                v = NUM[t]
                cur = cur + v if (cur >= 100 and cur % 100 == 0) else v
                seen = True
            elif t in HUND and seen: cur = (cur or 1) * 100 if cur < 100 else cur * 100
            elif t in UNIT and (seen or t in ("k",)):
                total += (cur or 1) * UNIT[t]; cur = 0; used_unit = True
            elif t in ("और", "अने", "अने", "and", "ने", "અને", "એને", "प्लस"): pass
            else: break
            j += 1
        total += cur if (used_unit and cur) else 0
        if used_unit and total >= 1000: out.append(round(total))
        elif seen and not used_unit and j > i and re.fullmatch(r"\d[\d,]*", toks[i]) and cur >= 1000: out.append(round(cur))
        i = max(j, i + 1)
    return out


if __name__ == "__main__":
    for s in ["पचपन हज़ार", "बीस हज़ार के अराउंड", "सत्रह हज़ार पाँच सौ", "अठ्ठाईस लाख", "અઠ્યાવીસ લાખ અને નેવું હજાર", "अढ़ी लाख", "28 lakh 90 thousand", "30,50,000", "चालीस पैंतालीस हज़ार", "તીસ હજાર", "one lakh fifty thousand"]:
        print(s, "->", amounts(s))
