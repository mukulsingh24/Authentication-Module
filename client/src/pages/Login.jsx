
import LoginPage from "../component/auth/LoginPage";
import { authConfig } from "../config/authConfig";

export default function Login() {
  return <LoginPage config={authConfig} />;
}
