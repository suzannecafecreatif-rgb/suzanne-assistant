import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError("Adresse e-mail ou mot de passe incorrect.");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="login-title">Suzanne</p>
        <p className="page-sub">Connexion privée</p>

        <label className="field">
          <span className="label">E-mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="label">Mot de passe</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </div>
  );
}
