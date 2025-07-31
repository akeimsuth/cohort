"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Target, Users } from "lucide-react"
import Link from "next/link"

export default function CreateCohort() {
  const [user, loading] = useAuthState(auth)
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [endDate, setEndDate] = useState("")
  const [creating, setCreating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push("/")
    }
  }, [user, loading, mounted, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim() || !goal.trim() || !endDate) return

    setCreating(true)
    try {
      const cohortData = {
        name: name.trim(),
        goal: goal.trim(),
        endDate: new Date(endDate),
        creatorId: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "cohorts"), cohortData)
      router.push(`/cohort/${docRef.id}`)
    } catch (error) {
      console.error("Error creating cohort:", error)
      setCreating(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Get tomorrow's date as minimum
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <Link href="/" className="mr-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Create New Cohort</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>New Accountability Group</span>
            </CardTitle>
            <CardDescription>Create a focused, time-bound group to achieve a specific goal together.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Cohort Name</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Train for 5K Marathon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  className="text-lg"
                />
                <p className="text-sm text-gray-500">Choose a clear, motivating name for your group</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">The Goal</Label>
                <Textarea
                  id="goal"
                  placeholder="Describe what you want to achieve together. Be specific about the outcome and any key milestones..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  maxLength={500}
                  rows={4}
                  required
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">{goal.length}/500 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>End Date</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={minDate}
                  required
                  className="text-lg"
                />
                <p className="text-sm text-gray-500">When should this cohort automatically archive?</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You'll get a shareable invite link</li>
                  <li>• Members can chat and collaborate in real-time</li>
                  <li>• The group automatically archives on the end date</li>
                  <li>• Focus on the goal, not endless engagement</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={creating || !name.trim() || !goal.trim() || !endDate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Cohort...
                  </>
                ) : (
                  "Create Cohort"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
