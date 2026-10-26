(() => {
  "use strict";

  const projectUrl = "https://dwqnaxfrldqnoiklwqzb.supabase.co";
  const publishableKey = "sb_publishable_vsOSXP1sWzqwayxDZ3zx_Q_WFzL6ga2";

  if (!window.supabase?.createClient) {
    throw new Error("Supabase JS did not load. Check the network connection and CDN access.");
  }

  window.orbitSupabase = window.supabase.createClient(projectUrl, publishableKey);
  const style = document.createElement("style");
  style.textContent = `
    body:not(.orbit-authenticated) .app { display: none !important; }
    #orbit-auth-gate { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 20px; background: #eef5f0; font: 15px system-ui,sans-serif; color: #173d2d; }
    #orbit-auth-gate[hidden] { display: none; }
    #orbit-auth-gate form { width: min(420px,100%); padding: 30px; border: 1px solid #cfe3d3; border-radius: 18px; background: white; box-shadow: 0 18px 50px #173d2d20; }
    #orbit-auth-gate h1 { margin: 0 0 8px; font-size: 25px; }
    #orbit-auth-gate p { margin: 0 0 20px; color: #66816f; line-height: 1.5; }
    #orbit-auth-gate label { display: block; margin: 12px 0 5px; font-size: 13px; font-weight: 650; }
    #orbit-auth-gate input { width: 100%; padding: 11px; border: 1px solid #cfe3d3; border-radius: 9px; }
    #orbit-auth-gate button { width: 100%; margin-top: 16px; padding: 11px; border: 0; border-radius: 9px; background: #17633f; color: white; font-weight: 700; cursor: pointer; }
    #orbit-auth-error { min-height: 20px; margin-top: 12px !important; color: #a64435 !important; font-size: 13px; }
    .orbit-signout { margin-left: 10px; padding: 8px 11px; border: 1px solid #cfe3d3; border-radius: 9px; background: white; color: #2b6846; cursor: pointer; }
  `;
  document.head.append(style);

  window.orbitAuthenticate = async (requiredRole, onAuthenticated) => {
    const gate = document.createElement("div");
    gate.id = "orbit-auth-gate";
    gate.hidden = true;
    gate.innerHTML = `<form id="orbit-auth-form">
      <h1>Orbit ${requiredRole === "manager" ? "manager" : "employee"} sign in</h1>
      <p>Sign in with your organization email and password.</p>
      <label for="orbit-auth-email">Organization email</label>
      <input id="orbit-auth-email" type="email" autocomplete="username" required>
      <label for="orbit-auth-password">Password</label>
      <input id="orbit-auth-password" type="password" autocomplete="current-password" required>
      <button id="orbit-auth-submit" type="submit">Sign in</button>
      <p id="orbit-auth-error" role="alert"></p>
    </form>`;
    document.body.append(gate);
    const errorMessage = gate.querySelector("#orbit-auth-error");
    const submit = gate.querySelector("#orbit-auth-submit");
    let redirectingToSignIn = false;
    const showGate = (message = "") => {
      if (redirectingToSignIn) return;
      redirectingToSignIn = true;
      document.body.classList.remove("orbit-authenticated");
      const signInUrl = new URL("./index.html", window.location.href);
      if (message) signInUrl.searchParams.set("error", message);
      window.location.replace(signInUrl.href);
    };
    const showApp = () => {
      document.body.classList.add("orbit-authenticated");
      gate.hidden = true;
    };
    const signout = document.createElement("button");
    signout.type = "button";
    signout.className = "orbit-signout";
    signout.textContent = "Sign out";
    signout.addEventListener("click", async () => {
      try {
        const { error } = await window.orbitSupabase.auth.signOut();
        if (error) throw error;
        showGate();
      } catch (error) {
        console.error("Supabase sign out failed:", error);
        showGate(`Sign out failed: ${error.message}`);
      }
    });
    document.querySelector(".top-actions")?.append(signout);

    const authenticateSession = async (session) => {
      if (!session?.user) {
        showGate();
        return;
      }
      const { data: profile, error } = await window.orbitSupabase
        .from("profiles")
        .select("id,display_name,role,capacity_pct")
        .eq("id", session.user.id)
        .single();
      if (error) {
        console.error("Could not load the signed-in profile:", error);
        showGate(error.code === "PGRST116"
          ? "No profile is linked to this Auth user. Create its profiles row, then sign in again."
          : `Could not load your profile: ${error.message}`);
        return;
      }
      if (profile.role !== requiredRole) {
        await window.orbitSupabase.auth.signOut();
        showGate(`This account has the "${profile.role}" role and cannot access the ${requiredRole} portal.`);
        return;
      }
      showApp();
      await onAuthenticated(session.user, profile);
    };

    gate.querySelector("#orbit-auth-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      errorMessage.textContent = "";
      try {
        const { data, error } = await window.orbitSupabase.auth.signInWithPassword({
          email: gate.querySelector("#orbit-auth-email").value.trim(),
          password: gate.querySelector("#orbit-auth-password").value
        });
        if (error) throw error;
        await authenticateSession(data.session);
      } catch (error) {
        console.error("Supabase sign in failed:", error);
        errorMessage.textContent = `Sign in failed: ${error.message}`;
      } finally {
        submit.disabled = false;
      }
    });

    window.orbitSupabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") showGate("You have been signed out.");
    });
    try {
      const { data, error } = await window.orbitSupabase.auth.getSession();
      if (error) throw error;
      await authenticateSession(data.session);
    } catch (error) {
      console.error("Could not restore the Supabase session:", error);
      showGate(`Could not restore your session: ${error.message}`);
    }
  };
})();
 