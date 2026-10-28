
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

async function fetchSection(letters) {
    console.log("Fetching section for letters: ", letters);

    id_table = LETTERS.indexOf(letters.toUpperCase());
    if (id_table === -1) {
        throw new Error(`Invalid letters: ${letters}`);
    }

    const response = await fetch(URL_API, {
        headers: { "Authorization": `Bearer ${getToken()}` },
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    return data && data.sections ? data.sections[id_table] : null;
}

(async () => {
    try {
        const section = await fetchSection("D");
        console.log("Fetched section: ", section);
    } catch (error) {
        console.error("Error fetching section: ", error);
    }
})();