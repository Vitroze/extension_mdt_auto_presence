const URL_API = "https://mdt.gtacityrp.fr/api/hr/department-sections";

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

    const weekDays = getCurrentWeekDates().map((date) => fmt(date));

    let all_deputies = [];
    for (const deputy of section.deputies) {
        const is_absent = deputy.absence && deputy.absence.startDate && deputy.absence.endDate &&
            weekDays.some((day) => day >= deputy.absence.startDate && day <= deputy.absence.endDate);

        all_deputies.push({
            firstName: deputy.firstName,
            lastName: deputy.lastName,
            is_absent: is_absent,
        });
    }

    return all_deputies;
}

function getCurrentWeekDates(length = 8) {
    let inputElements = document.querySelectorAll("input[data-fr-date='date']");
    let inputElement = inputElements[0];
    if (!inputElement) {
        console.error("Start date element not found.");
        return [];
    }
    const parts = inputElement.value.trim().split('/');
    if (parts.length !== 3) {
        console.error("Format de date invalide.");
        return [];
    }

    let startDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

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

function formatTime(ms, formatSentence = false) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (formatSentence) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

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

const PRESENCE_VALID = {
    CORRECT: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    MOYEN: 3 * 60 * 60 * 1000, // 3 hours in milliseconds
    BAD: 1 * 60 * 1000, // 1 hour in milliseconds
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
        const nameSpan = row.querySelector("span");
        const name = nameSpan ? nameSpan.textContent : null;
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
            let status = getPresenceStatus(stats.totalMs);
            if (status === "INEXISTANT" && d.is_absent) {
                status = "ABSENT";
            }

            const row = findRow(rows, d.firstName, d.lastName);
            if (!row) {
                console.warn(`Ligne introuvable : ${d.firstName} ${d.lastName}`);
                continue;
            }
            clickStatus(row, status);

            const nameSpan = row.querySelector("span");
            if (nameSpan) {
                let badge = nameSpan.parentNode.querySelector(".time-badge");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "time-badge";
                    badge.style.cssText = "margin-left: 8px; font-size: 0.9em; color: #9aa4b2;";
                    nameSpan.parentNode.appendChild(badge);
                }

                badge.textContent = `(${formatTime(stats.totalMs)})`;
            }

            if (d.is_absent) {
                console.log(`Deputy ${d.firstName} ${d.lastName} is absent, adding absence badge.`);
                let badge = row.querySelector(".absence-badge");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "absence-badge";
                    badge.style.cssText = "margin-left: 8px; font-size: 0.9em; color: #f87171;";
                    nameSpan.parentNode.appendChild(badge);
                }
                badge.textContent = "(Absence justifiée)";

                if (status !== "ABSENT") {
                    const textarea = row.querySelector("textarea");
                    if (textarea) {
                        textarea.value = `L'adjoint est en absence justifiée mais a effectué ${formatTime(stats.totalMs, true)} de présence cette semaine.`;
                        const event = new Event("input", { bubbles: true });
                        textarea.dispatchEvent(event);
                    }
                }
            }

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
    btn.textContent = `Remplir automatiquement (du ${fmt(getCurrentWeekDates()[0])} au ${fmt(getCurrentWeekDates()[6])})`;
    btn.style.cssText =
        "margin:8px 0;padding:6px 12px;border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;";
    btn.addEventListener("click", () => fillPresence(btn));
    h3.after(btn);
}

new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
injectButton();
