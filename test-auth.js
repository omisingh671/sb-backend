// test-auth-flow.js
const axios = require("axios").default;
const fs = require("fs");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

// Create a cookie jar that will store cookies between requests
const jar = new CookieJar();

// Wrap axios instance to support cookies in Node
const instance = wrapper(
  axios.create({
    baseURL: "http://localhost:4000/api",
    withCredentials: true, // allow credentials
    jar, // use the cookie jar
  })
);

async function main() {
  // 1) LOGIN
  const loginRes = await instance.post("/auth/login", {
    email: "user@demo.com",
    password: "password123",
  });

  console.log("login body:", loginRes.data);
  const accessToken = loginRes.data.accessToken;

  // Optional: see cookies currently in jar
  const cookiesForDomain = await jar.getCookies(
    "http://localhost:4000/api/auth/login"
  );
  console.log("cookies after login:", cookiesForDomain.map(String));

  // 2) CALL PROTECTED ENDPOINT WITH ACCESS TOKEN
  const spaces = await instance.get("/spaces", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log("spaces:", spaces.data);

  // 3) REFRESH (cookie is now actually sent by axios+jar)
  const refreshRes = await instance.post("/auth/refresh");
  console.log("refresh:", refreshRes.data);

  // 4) LOGOUT (also uses same refresh cookie)
  const logoutRes = await instance.post("/auth/logout");
  console.log("logout:", logoutRes.data);
}

main().catch((err) => {
  console.error(
    "REQUEST FAILED:",
    err.response ? err.response.status : "",
    err.response ? err.response.data : err.message
  );
});
