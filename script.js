
const URL_API = "https://mdt.gtacityrp.fr/api/hr/department-sections";
const AUTHORIZATION_TOKEN = "Bearer eyJzdGVhbUlkIjoiNzY1NjExOTgzODkxMjM3NzYiLCJ0aW1lc3RhbXAiOjE3OTMxNTEzNzgyODUsImhhc2giOiIzYjkxODZmYWY3MzgzNzU5N2ZkM2I2ZTE5NDY3ZDJiMGI1MjFkYmRlMjVlOWMwZGEzY2VhN2ZmMDUxYjU2YjEwIn0=";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

function getToken() {
    try {
        return JSON.parse(localStorage.getItem("mdt-auth-storage")).state.token;
    } catch (error) {
        console.error("Error retrieving token from localStorage: ", error);
        return null;
    }
}

async function getIDSection() {
    const response = await fetch("https://mdt.gtacityrp.fr/api/supervision/sections/mine", {
        headers: { "Authorization": `Bearer ${getToken()}` },
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched section data: ", data);
    console.log("Section letter: ", data.letter);
    return data && data.letter ? LETTERS.indexOf(data.letter.toUpperCase()) : -1;
}

async function fetchSection(id_table) {
    if (id_table < 0 || id_table >= LETTERS.length) {
        console.error("Invalid section ID: ", id_table);
        return null;
    }

    const response = await fetch(URL_API, {
        headers: { "Authorization": `Bearer ${getToken()}` },
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data && data.sections ? data.sections[id_table] : null;
}

function getDeputies(section) {
    if (!section || !section.deputies) {
        console.error("Invalid section data: ", section);
        return [];
    }

    all_deputies = [];
    for (const deputy of section.deputies) {
        all_deputies.push({
            firstName: deputy.firstName,
            lastName: deputy.lastName,
            is_absent: deputy.absence === null ? false : deputy.absence,
        });
    }

    return all_deputies;
}

const startWeek = "Sunday";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getCurrentWeekDates(length = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDayIndex = DAYS.indexOf(startWeek);
    const daysSinceStart = (today.getDay() - startDayIndex + 7) % 7;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysSinceStart);

    return Array.from({ length }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return d;
    });
}

async function getActivityStats(firstName, lastName) {
    const url = `https://mdt.gtacityrp.fr/api/hr/activity-stats?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&page=1&pageSize=10`;
    const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${getToken()}` },
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

const fmt = (date) =>
    `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

async function getDeputyWeeklyStats(firstName, lastName) {
    try {
        const activityStats = await getActivityStats(firstName, lastName);
        const byDay = Object.fromEntries(activityStats.daily.map((day) => [day.date, day.ms]));
        const days = getCurrentWeekDates().map((date) => {
            const key = fmt(date);
            return {
                date: key,
                ms: byDay[key] || 0,
            };
        });

        return {
            days,
            totalMs: days.reduce((sum, d) => sum + d.ms, 0),
            daysPresent: days.filter((d) => d.ms > 0).length,
        };
    } catch (error) {
        return {
            days: [],
            totalMs: 0,
            daysPresent: 0,
        };
    }
}

const PRESENCE_VALID = { // Si inférieur à 1h, on considère que le policier n'était pas présent, sinon si inférieur à 2h, on considère qu'il était présent mais pas toute la journée, sinon il était présent toute la journée.
    CORRECT: 6 * 60 * 60 * 1000, // 2h en ms
    MOYEN: 3 * 60 * 60 * 1000, // 1h en ms
    BAD: 1 * 60 * 1000, // 30min en ms
    NEVER: 0,
}

function getPresenceStatus(ms) {
    if (ms >= PRESENCE_VALID.CORRECT) {
        return "CORRECT";
    } else if (ms >= PRESENCE_VALID.MOYEN) {
        return "MOYENNE";
    } else if (ms >= PRESENCE_VALID.BAD) {
        return "MAUVAISE";
    } else {
        return "INEXISTANT";
    }
}

function isWriteRHS() {
    const h3 = document.querySelector("h3[class='sc-hIcDrS fVclQs']");
    return h3 ? h3.textContent.trim().toLowerCase() == "période du rapport" : false;
}

const STATUS_TO_TITLE = {
    CORRECT: "CORRECTE",
    MOYENNE: "MOYENNE",
    MAUVAISE: "MAUVAISE",
    INEXISTANT: "INEXISTANTE",
    ABSENT: "ABSENCE JUSTIFIÉE",
};

const norm = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

function getRows() {
    const rows = new Map();
    document.querySelectorAll('button[title="CORRECTE"]').forEach((btn) => {
        const row = btn.parentElement.parentElement;
        const name = row.querySelector("span")?.textContent;
        if (name) rows.set(norm(name), row);
    });
    return rows;
}

function findRow(rows, firstName, lastName) {
    const full = norm(`${firstName} ${lastName}`);
    if (rows.has(full)) return rows.get(full);
    const f = norm(firstName), l = norm(lastName);
    for (const [name, row] of rows) {
        if (name.startsWith(f) && name.endsWith(l)) return row;
    }
    return null;
}

function clickStatus(row, status) {
    row.querySelector(`button[title="${STATUS_TO_TITLE[status]}"]`)?.click();
}

async function fillPresence(btn) {
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = "Remplissage...";
    try {
        const idSection = await getIDSection();
        if (idSection === -1) throw new Error("Section introuvable");

        const deputies = getDeputies(await fetchSection(idSection));
        const rows = getRows();

        for (const d of deputies) {
            const stats = await getDeputyWeeklyStats(d.firstName, d.lastName);
            const status = d.is_absent ? "ABSENT" : getPresenceStatus(stats.totalMs);
            const row = findRow(rows, d.firstName, d.lastName);
            if (!row) {
                console.warn(`Ligne introuvable : ${d.firstName} ${d.lastName}`);
                continue;
            }
            clickStatus(row, status);
            console.log(`${d.firstName} ${d.lastName} → ${status} (${formatTime(stats.totalMs)})`);
        }
        btn.textContent = "Terminé ✔";
    } catch (e) {
        console.error("Erreur :", e);
        btn.textContent = "Erreur (voir console)";
    } finally {
        btn.disabled = false;
        setTimeout(() => (btn.textContent = label), 3000);
    }
}

function injectButton() {
    const h3 = [...document.querySelectorAll("h3")].find(
        (h) => h.textContent.trim() === "Présence des adjoints"
    );
    if (!h3 || document.getElementById("auto-fill-presence")) return;

    const btn = document.createElement("button");
    btn.id = "auto-fill-presence";
    btn.type = "button";
    btn.textContent = "Remplir automatiquement";
    btn.style.cssText =
        "margin:8px 0;padding:6px 12px;border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;";
    btn.addEventListener("click", () => fillPresence(btn));
    h3.after(btn);
}

new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
injectButton();

(async () => {
    try {
        const idSection = await getIDSection();
        if (idSection === -1) {
            console.error("Could not determine section ID.");
            return;
        }
        const section = await fetchSection(idSection);
        const deputies = getDeputies(section);

        for (const deputy of deputies) {
            const stats = await getDeputyWeeklyStats(deputy.firstName, deputy.lastName);
            const presenceStatus = getPresenceStatus(stats.totalMs);
            console.log(`Weekly stats for ${deputy.firstName} ${deputy.lastName}: `, {
                totalMs: stats.totalMs,
                daysPresent: stats.daysPresent,
                presenceStatus: deputy.is_absent ? "ABSENT" : presenceStatus,
            });
        }
    } catch (error) {
        console.error("Error fetching section: ", error);
    }
})();