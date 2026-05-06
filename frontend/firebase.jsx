import { initializeApp } from "firebase/app";
import { getAuth, updateEmail } from "firebase/auth";
import { firebaseConfig } from "./config"; // اینجا مسیر کانفیگت رو درست تنظیم کن

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, updateEmail };
