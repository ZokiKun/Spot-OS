import { pick } from "@/lib/direction-server";
import { LoginView as LoginView1 } from "@/components/login/login-view";
import { LoginView as LoginView2 } from "@/directions/d2/components/login-view";
import { LoginView as LoginView3 } from "@/directions/d3/components/login-view";

export default async function LoginPage() {
  const View = await pick({ 1: LoginView1, 2: LoginView2, 3: LoginView3 });
  return <View />;
}
