// SAGI SDK client — signal path surface (game host app).
// All UI code imports from here only. Swap to the real SDK by reimplementing this file.
const BASE = "/api/sagi";
async function request(path, init) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });
    if (!res.ok)
        throw new Error(`SAGI API ${res.status}: ${await res.text().catch(() => "")}`);
    return res.json();
}
export const registerUser = (deviceId) => request("/users", { method: "POST", body: JSON.stringify({ device_id: deviceId }) });
export const requestTask = (userId) => request(`/tasks/next?user_id=${encodeURIComponent(userId)}`);
export const submitSignal = (taskId, userId, picked, candidateAId, candidateBId) => request("/signal", {
    method: "POST",
    body: JSON.stringify({ task_id: taskId, user_id: userId, picked, candidate_a_id: candidateAId, candidate_b_id: candidateBId }),
});
export const getSignalResult = (betId) => request(`/signal/${encodeURIComponent(betId)}`);
export const getWallet = (userId) => request(`/users/${encodeURIComponent(userId)}/wallet`);
export const getStats = () => request("/stats");
