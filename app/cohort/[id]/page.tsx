"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Send, Plus, Users, Calendar, Clock, Share2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { signInWithGoogle } from "@/lib/auth"

interface Cohort {
  id: string
  name: string
  goal: string
  endDate: Timestamp
  creatorId: string
  members: string[]
}

interface Message {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: Timestamp
}

interface Task {
  id: string
  text: string
  isCompleted: boolean
  creatorId: string
}

export default function CohortRoom() {
  const params = useParams()
  const router = useRouter()
  const [user, loading, error] = useAuthState(auth)
  const [cohort, setCohort] = useState<Cohort | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [newTask, setNewTask] = useState("")
  const [loadingCohort, setLoadingCohort] = useState(true)
  const [timeLeft, setTimeLeft] = useState("")
  const [mounted, setMounted] = useState(false)

  const cohortId = params.id as string

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate time remaining
  useEffect(() => {
    if (!cohort?.endDate) return

    const updateTimeLeft = () => {
      const now = new Date().getTime()
      const end = cohort.endDate.toDate().getTime()
      const difference = end - now
      console.log("Difference: ",difference);
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`)
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`)
        } else {
          setTimeLeft(`${minutes}m`)
        }
      } else {
        setTimeLeft("Ended")
      }
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [cohort?.endDate])

  // Load cohort data
  useEffect(() => {
    if (!mounted) return

    const loadCohort = async () => {
      try {
        const cohortDoc = await getDoc(doc(db, "cohorts", cohortId))
        if (cohortDoc.exists()) {
          setCohort({ id: cohortDoc.id, ...cohortDoc.data() } as Cohort)
        } else {
          router.push("/")
        }
      } catch (error) {
        console.error("Error loading cohort:", error)
        router.push("/")
      } finally {
        setLoadingCohort(false)
      }
    }

    loadCohort()
  }, [cohortId, router, mounted])

  // Listen to messages
  useEffect(() => {
    if (!mounted || !cohortId) return

    const q = query(collection(db, "cohorts", cohortId, "messages"), orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]
      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [cohortId, mounted])

  // Listen to tasks
  useEffect(() => {
    if (!mounted || !cohortId) return

    const q = query(collection(db, "cohorts", cohortId, "tasks"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[]
      setTasks(tasksData)
    })

    return () => unsubscribe()
  }, [cohortId, mounted])

  const handleJoinCohort = async () => {
    if (!user) {
      try {
        await signInWithGoogle()
      } catch (error) {
        console.error("Sign in error:", error)
      }
      return
    }

    if (!cohort || cohort.members.includes(user.uid)) return

    try {
      await updateDoc(doc(db, "cohorts", cohortId), {
        members: arrayUnion(user.uid),
      })
    } catch (error) {
      console.error("Error joining cohort:", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim() || !cohort || isExpired()) return

    try {
      await addDoc(collection(db, "cohorts", cohortId, "messages"), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        timestamp: serverTimestamp(),
      })
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newTask.trim() || !cohort || isExpired()) return

    try {
      await addDoc(collection(db, "cohorts", cohortId, "tasks"), {
        text: newTask.trim(),
        isCompleted: false,
        creatorId: user.uid,
      })
      setNewTask("")
    } catch (error) {
      console.error("Error adding task:", error)
    }
  }

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    if (!user || !cohort || isExpired()) return

    try {
      await updateDoc(doc(db, "cohorts", cohortId, "tasks", taskId), {
        isCompleted: !isCompleted,
      })
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/cohort/${cohortId}`
    try {
      await navigator.share({
        title: cohort?.name,
        text: `Join my accountability group: ${cohort?.name}`,
        url: url,
      })
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(url)
      alert("Invite link copied to clipboard!")
    }
  }

  const isExpired = () => {
    return cohort && new Date() > cohort.endDate.toDate()
  }

  const isMember = () => {
    return user && cohort && cohort.members.includes(user.uid)
  }

  if (!mounted || loadingCohort || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  if (!cohort) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cohort not found</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Show join page for non-members
  if (!isMember()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">{cohort.name}</CardTitle>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{cohort.members.length} members</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Ends {cohort.endDate.toDate().toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Our Goal</h3>
              <p className="text-gray-700 text-sm">{cohort.goal}</p>
            </div>

            {isExpired() ? (
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">This cohort has ended</p>
              </div>
            ) : (
              <Button onClick={handleJoinCohort} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3">
                {user ? "Join Cohort" : "Sign in to Join"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{cohort.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{cohort.members.length} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span className={timeLeft === "Ended" ? "text-red-600 font-medium" : ""}>
                      {timeLeft === "Ended" ? "Ended" : `${timeLeft} left`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {isExpired() && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">This cohort has ended and is now read-only.</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Goal & Tasks */}
          <div className="lg:col-span-1 space-y-6">
            {/* Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Our Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{cohort.goal}</p>
              </CardContent>
            </Card>

            {/* Shared Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shared Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start space-x-3">
                      <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)}
                        disabled={isExpired() || false}
                        className="mt-1"
                      />
                      <span className={`text-sm ${task.isCompleted ? "line-through text-gray-500" : "text-gray-900"}`}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>

                {!isExpired() && (
                  <form onSubmit={handleAddTask} className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="Add a task..."
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={!newTask.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Group Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{message.senderName}</span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp?.toDate().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 bg-gray-50 rounded-lg px-3 py-2 inline-block">{message.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                {!isExpired() && (
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
