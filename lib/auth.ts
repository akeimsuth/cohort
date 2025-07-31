import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth"
import { auth, db } from "./firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"

const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Create or update user document in Firestore
    const userRef = doc(db, "users", user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date(),
      })
    }

    return result
  } catch (error) {
    console.error("Error signing in with Google:", error)
    throw error
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error("Error signing out:", error)
    throw error
  }
}
