"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, Calendar, Target } from "lucide-react"
import Link from "next/link"
import { signInWithGoogle, signOut } from "@/lib/auth"

interface Cohort {
  id: string
  name: string
  goal: string
  endDate: unknown
  creatorId: string
  members: string[]
}

export default function Dashboard() {
  const [user, loading, error] = useAuthState(auth)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loadingCohorts, setLoadingCohorts] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || loading) return

    if (user) {
      // Listen to cohorts where user is a member
      const q = query(
        collection(db, "cohorts"),
        where("members", "array-contains", user.uid),
        orderBy("endDate", "asc"),
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cohortsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Cohort[]
        setCohorts(cohortsData)
        setLoadingCohorts(false)
      })

      return () => unsubscribe()
    } else {
      setLoadingCohorts(false)
    }
  }, [user, loading, mounted])

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error("Sign in error:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const isExpired = (endDate: unknown) => {
    return new Date() > (endDate as Date)
  }

  const formatDate = (date: unknown) => {
    return (date as Timestamp).toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Don't render anything until mounted on client
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication error. Please refresh the page.</p>
        </div>
      </div>
    )
  }

  // Rest of the component remains the same...
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Cohort</h1>
              <p className="text-gray-600 text-lg">Finite social media for focused goals</p>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Small Groups</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-600">Clear Goals</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Time-bound</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                Create temporary accountability groups that archive themselves when goals are achieved.
              </p>
            </div>

            <Button onClick={handleSignIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg">
              Sign in with Google
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cohort</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.displayName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Cohort
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loadingCohorts ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your cohorts...</p>
          </div>
        ) : cohorts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No cohorts yet</h2>
            <p className="text-gray-600 mb-6">Create your first accountability group to get started.</p>
            <Link href="/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Cohort
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Your Cohorts</h2>
              <span className="text-sm text-gray-500">{cohorts.length} active</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cohorts.map((cohort) => (
                <Card
                  key={cohort.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isExpired(cohort.endDate) ? "opacity-75 bg-gray-50" : "hover:shadow-lg"
                  }`}
                  onClick={() => router.push(`/cohort/${cohort.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold line-clamp-2">{cohort.name}</CardTitle>
                      {isExpired(cohort.endDate) && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">Ended</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="line-clamp-3 mb-4">{cohort.goal}</CardDescription>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{cohort.members.length} members</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(cohort.endDate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
