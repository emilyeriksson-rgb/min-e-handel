import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import AuthContext from "./AuthContext.js";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
} from "../api/api.js";

function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    user: null,
    loading: true,
    error: "",
  });

  const startupController = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    startupController.current = controller;

    async function loadUser() {
      try {
        const user = await fetchCurrentUser(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setAuth({
            user,
            loading: false,
            error: "",
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setAuth({
            user: null,
            loading: false,
            error:
              "Inloggningsstatus kunde inte hämtas. Försök ladda om sidan.",
          });
        }
      }
    }

    loadUser();

    return () => controller.abort();
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials);

    // Ett gammalt startup-anrop får inte skriva över
    // användaren som just loggat in.
    startupController.current?.abort();

    setAuth({
      user: data.user,
      loading: false,
      error: "",
    });

    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();

    startupController.current?.abort();

    setAuth({
      user: null,
      loading: false,
      error: "",
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: auth.user,
        loading: auth.loading,
        error: auth.error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;