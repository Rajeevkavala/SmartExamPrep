"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import SubtopicChipEditor from "@/components/admin/SubtopicChipEditor";
import {
  fireButtonClass,
  ghostButtonClass,
  PageHeader,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type SubjectRecord = {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  topic_count: number;
};

type TopicRecord = {
  id: string;
  subject_id: string;
  name: string;
  subtopics: string[];
  nlp_keyword_tags: string[];
  display_order: number;
  difficulty_weight: number;
};

type TopicDeleteTarget = {
  subjectId: string;
  topicId: string;
};

const getErrorMessage = (error: unknown) => {
  const detail = (error as { response?: { data?: { detail?: string } } })
    ?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Request failed. Please try again.";
};

const normalizeSubjectList = (subjects: SubjectRecord[]) =>
  [...subjects].sort((a, b) => {
    const orderDiff = Number(a.display_order ?? 0) - Number(b.display_order ?? 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return a.name.localeCompare(b.name);
  });

const normalizeTopicList = (topics: TopicRecord[]) =>
  [...topics].sort((a, b) => {
    const orderDiff = Number(a.display_order ?? 0) - Number(b.display_order ?? 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return a.name.localeCompare(b.name);
  });

const parseNumberInput = (value: string, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
};

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<
    Record<string, TopicRecord[]>
  >({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(
    {}
  );
  const [topicsLoadingMap, setTopicsLoadingMap] = useState<Record<string, boolean>>(
    {}
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");
  const [newSubjectOrder, setNewSubjectOrder] = useState("0");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");
  const [isSavingSubjectName, setIsSavingSubjectName] = useState(false);

  const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<
    string | null
  >(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [topicDialogMode, setTopicDialogMode] = useState<"create" | "edit">(
    "create"
  );
  const [topicDialogSubjectId, setTopicDialogSubjectId] = useState<string | null>(
    null
  );
  const [topicEditingId, setTopicEditingId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState("");
  const [topicSubtopics, setTopicSubtopics] = useState<string[]>([]);
  const [topicKeywords, setTopicKeywords] = useState<string[]>([]);
  const [topicDifficultyWeight, setTopicDifficultyWeight] = useState(1);
  const [topicDisplayOrder, setTopicDisplayOrder] = useState("0");
  const [isSavingTopic, setIsSavingTopic] = useState(false);

  const [confirmDeleteTopic, setConfirmDeleteTopic] =
    useState<TopicDeleteTarget | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const currentTopicDialogSubject = useMemo(
    () => subjects.find((subject) => subject.id === topicDialogSubjectId) ?? null,
    [subjects, topicDialogSubjectId]
  );

  const loadSubjects = async (showSkeleton: boolean) => {
    if (showSkeleton) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setError(null);
      const { data } = await adminApi.get<SubjectRecord[]>("/content/subjects");
      setSubjects(normalizeSubjectList(Array.isArray(data) ? data : []));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadTopics = async (subjectId: string, force = false) => {
    if (!force && topicsBySubject[subjectId]) {
      return;
    }

    setTopicsLoadingMap((previous) => ({ ...previous, [subjectId]: true }));

    try {
      const { data } = await adminApi.get<TopicRecord[]>(
        `/content/subjects/${subjectId}/topics`
      );
      setTopicsBySubject((previous) => ({
        ...previous,
        [subjectId]: normalizeTopicList(Array.isArray(data) ? data : []),
      }));
    } catch (topicLoadError) {
      setActionError(getErrorMessage(topicLoadError));
    } finally {
      setTopicsLoadingMap((previous) => ({ ...previous, [subjectId]: false }));
    }
  };

  useEffect(() => {
    void loadSubjects(true);
  }, []);

  const handleToggleSubject = (subjectId: string) => {
    const isExpanded = Boolean(expandedSubjects[subjectId]);

    setExpandedSubjects((previous) => ({
      ...previous,
      [subjectId]: !isExpanded,
    }));

    if (!isExpanded) {
      void loadTopics(subjectId);
    }
  };

  const resetSubjectDialog = () => {
    setNewSubjectName("");
    setNewSubjectDescription("");
    setNewSubjectOrder("0");
  };

  const handleCreateSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newSubjectName.trim();
    if (!name) {
      return;
    }

    setActionError(null);
    setIsCreatingSubject(true);

    try {
      await adminApi.post("/content/subjects", {
        name,
        description: newSubjectDescription.trim() || undefined,
        display_order: parseNumberInput(newSubjectOrder, 0),
      });

      setSubjectDialogOpen(false);
      resetSubjectDialog();
      await loadSubjects(false);
      toast({
        title: "Subject created",
        description: `${name} has been added.`,
      });
    } catch (createError) {
      setActionError(getErrorMessage(createError));
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const beginSubjectInlineEdit = (subject: SubjectRecord) => {
    setActionError(null);
    setEditingSubjectId(subject.id);
    setEditingSubjectName(subject.name);
  };

  const cancelSubjectInlineEdit = () => {
    setEditingSubjectId(null);
    setEditingSubjectName("");
  };

  const saveSubjectInlineEdit = async (subjectId: string) => {
    const nextName = editingSubjectName.trim();
    if (!nextName) {
      return;
    }

    setActionError(null);
    setIsSavingSubjectName(true);

    try {
      await adminApi.put(`/content/subjects/${subjectId}`, { name: nextName });

      setSubjects((previous) =>
        normalizeSubjectList(
          previous.map((subject) =>
            subject.id === subjectId ? { ...subject, name: nextName } : subject
          )
        )
      );

      cancelSubjectInlineEdit();
      toast({
        title: "Subject updated",
        description: "Subject name updated successfully.",
      });
    } catch (updateError) {
      setActionError(getErrorMessage(updateError));
    } finally {
      setIsSavingSubjectName(false);
    }
  };

  const deleteSubject = async (subjectId: string) => {
    setActionError(null);
    setDeletingSubjectId(subjectId);

    try {
      await adminApi.delete(`/content/subjects/${subjectId}`);

      setSubjects((previous) => previous.filter((subject) => subject.id !== subjectId));
      setExpandedSubjects((previous) => {
        const next = { ...previous };
        delete next[subjectId];
        return next;
      });
      setTopicsBySubject((previous) => {
        const next = { ...previous };
        delete next[subjectId];
        return next;
      });

      setConfirmDeleteSubjectId(null);
      toast({
        title: "Subject deleted",
        description: "The subject and its nested data were removed.",
      });
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
    } finally {
      setDeletingSubjectId(null);
    }
  };

  const resetTopicDialog = () => {
    setTopicDialogMode("create");
    setTopicDialogSubjectId(null);
    setTopicEditingId(null);
    setTopicName("");
    setTopicSubtopics([]);
    setTopicKeywords([]);
    setTopicDifficultyWeight(1);
    setTopicDisplayOrder("0");
  };

  const openCreateTopicDialog = (subjectId: string) => {
    setActionError(null);
    setTopicDialogMode("create");
    setTopicDialogSubjectId(subjectId);
    setTopicEditingId(null);
    setTopicName("");
    setTopicSubtopics([]);
    setTopicKeywords([]);
    setTopicDifficultyWeight(1);
    setTopicDisplayOrder("0");
    setTopicDialogOpen(true);
  };

  const openEditTopicDialog = (subjectId: string, topic: TopicRecord) => {
    setActionError(null);
    setTopicDialogMode("edit");
    setTopicDialogSubjectId(subjectId);
    setTopicEditingId(topic.id);
    setTopicName(topic.name);
    setTopicSubtopics(topic.subtopics ?? []);
    setTopicKeywords(topic.nlp_keyword_tags ?? []);
    setTopicDifficultyWeight(Number(topic.difficulty_weight ?? 1));
    setTopicDisplayOrder(String(topic.display_order ?? 0));
    setTopicDialogOpen(true);
  };

  const forceCloseTopicDialog = () => {
    setTopicDialogOpen(false);
    resetTopicDialog();
  };

  const closeTopicDialog = () => {
    if (isSavingTopic) {
      return;
    }
    forceCloseTopicDialog();
  };

  const saveTopic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const activeSubjectId = topicDialogSubjectId;
    const trimmedName = topicName.trim();

    if (!activeSubjectId || !trimmedName) {
      return;
    }

    const payload = {
      name: trimmedName,
      subtopics: topicSubtopics,
      nlp_keyword_tags: topicKeywords,
      display_order: parseNumberInput(topicDisplayOrder, 0),
      difficulty_weight: Math.min(
        2,
        Math.max(0.5, Number(topicDifficultyWeight || 1))
      ),
    };

    setActionError(null);
    setIsSavingTopic(true);

    try {
      if (topicDialogMode === "create") {
        await adminApi.post(`/content/subjects/${activeSubjectId}/topics`, payload);
      } else if (topicEditingId) {
        await adminApi.put(`/content/topics/${topicEditingId}`, payload);
      }

      await loadTopics(activeSubjectId, true);
      await loadSubjects(false);
      forceCloseTopicDialog();
      toast({
        title: topicDialogMode === "create" ? "Topic created" : "Topic updated",
        description:
          topicDialogMode === "create"
            ? "New topic added successfully."
            : "Topic changes saved successfully.",
      });
    } catch (topicError) {
      setActionError(getErrorMessage(topicError));
    } finally {
      setIsSavingTopic(false);
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    setActionError(null);
    setDeletingTopicId(topicId);

    try {
      await adminApi.delete(`/content/topics/${topicId}`);
      await loadTopics(subjectId, true);
      await loadSubjects(false);
      setConfirmDeleteTopic(null);
      toast({
        title: "Topic deleted",
        description: "The topic has been removed.",
      });
    } catch (topicError) {
      setActionError(getErrorMessage(topicError));
    } finally {
      setDeletingTopicId(null);
    }
  };

  const onSubjectNameInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    subjectId: string
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveSubjectInlineEdit(subjectId);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelSubjectInlineEdit();
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading subjects manager..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠"
        title="Subjects Manager unavailable"
        description={error}
        ctaLabel="Retry"
        ctaHref="/admin/subjects"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        className="app-noise"
        eyebrow="Admin workflow"
        title="SUBJECTS MANAGER"
        description="Organize subjects and topics that power quizzes, diagnostics, roadmap analysis, and scraper classification."
        badge={<StatusBadge tone="ice">{subjects.length} subjects loaded</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(ghostButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
              onClick={() => void loadSubjects(false)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </Button>

            <Dialog
              open={subjectDialogOpen}
              onOpenChange={(open) => {
                setSubjectDialogOpen(open);
                if (!open) {
                  resetSubjectDialog();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  className={cn(fireButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add Subject
                </Button>
              </DialogTrigger>

              <DialogContent className={cn(panelClass, "max-w-lg border-white/12 text-[var(--cream)]")}>
                <DialogHeader>
                  <DialogTitle>Add Subject</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Create a new subject for the question bank.
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleCreateSubject}>
                  <div className="space-y-1.5">
                    <label htmlFor="subject-name" className="text-sm text-slate-300">
                      Subject Name
                    </label>
                    <Input
                      id="subject-name"
                      value={newSubjectName}
                      onChange={(event) => setNewSubjectName(event.target.value)}
                      placeholder="Operating Systems"
                      className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="subject-description"
                      className="text-sm text-slate-300"
                    >
                      Description
                    </label>
                    <textarea
                      id="subject-description"
                      value={newSubjectDescription}
                      onChange={(event) =>
                        setNewSubjectDescription(event.target.value)
                      }
                      rows={3}
                      placeholder="Optional subject context"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="subject-order" className="text-sm text-slate-300">
                      Display Order
                    </label>
                    <Input
                      id="subject-order"
                      type="number"
                      min={0}
                      step={1}
                      value={newSubjectOrder}
                      onChange={(event) => setNewSubjectOrder(event.target.value)}
                      className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(ghostButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
                      onClick={() => setSubjectDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className={cn(fireButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
                      disabled={isCreatingSubject}
                    >
                      {isCreatingSubject ? "Saving..." : "Save Subject"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {actionError ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {actionError}
        </p>
      ) : null}

      {subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No subjects yet"
          description="Add your first subject to start organizing topics."
        />
      ) : (
        <section className="space-y-3">
          {subjects.map((subject) => {
            const isExpanded = Boolean(expandedSubjects[subject.id]);
            const isEditing = editingSubjectId === subject.id;
            const isTopicsLoading = Boolean(topicsLoadingMap[subject.id]);
            const topics = topicsBySubject[subject.id] ?? [];

            return (
              <article
                key={subject.id}
                className={cn(panelClass, "overflow-hidden")}
              >
                <div
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!isEditing) {
                      handleToggleSubject(subject.id);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!isEditing && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      handleToggleSubject(subject.id);
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition ${
                      isExpanded ? "rotate-180" : "rotate-0"
                    }`}
                    aria-hidden
                  />

                  <div className="min-w-40 flex-1">
                    {isEditing ? (
                      <Input
                        value={editingSubjectName}
                        onChange={(event) => setEditingSubjectName(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) =>
                          onSubjectNameInputKeyDown(event, subject.id)
                        }
                        className="h-8 border-slate-700 bg-slate-900 text-sm text-slate-100"
                        aria-label="Edit subject name"
                        autoFocus
                      />
                    ) : (
                      <h2 className="text-base font-semibold text-white">{subject.name}</h2>
                    )}
                  </div>

                  <p className="text-sm text-slate-400">{subject.topic_count} topics</p>

                  <div
                    className="flex items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-indigo-600 text-white hover:bg-indigo-500"
                          onClick={() => void saveSubjectInlineEdit(subject.id)}
                          disabled={isSavingSubjectName}
                          aria-label="Save subject name"
                        >
                          {isSavingSubjectName ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                          onClick={cancelSubjectInlineEdit}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                          onClick={() => beginSubjectInlineEdit(subject)}
                          aria-label={`Edit ${subject.name}`}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Button>

                        <AlertDialog
                          open={confirmDeleteSubjectId === subject.id}
                          onOpenChange={(open) =>
                            setConfirmDeleteSubjectId(open ? subject.id : null)
                          }
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Delete ${subject.name}`}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                              Delete
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete subject?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                This will remove the subject, related topics, and linked
                                questions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-rose-600 text-white hover:bg-rose-500"
                                onClick={() => void deleteSubject(subject.id)}
                                disabled={deletingSubjectId === subject.id}
                              >
                                {deletingSubjectId === subject.id
                                  ? "Deleting..."
                                  : "Delete Subject"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-slate-800 px-4 py-4">
                    {isTopicsLoading ? (
                      <p className="text-sm text-slate-400">Loading topics...</p>
                    ) : topics.length === 0 ? (
                      <p className="text-sm text-slate-400">No topics added for this subject.</p>
                    ) : (
                      <div className="space-y-2">
                        {topics.map((topic) => {
                          const isDeleteOpen =
                            confirmDeleteTopic?.topicId === topic.id &&
                            confirmDeleteTopic.subjectId === subject.id;

                          return (
                            <div
                              key={topic.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                            >
                              <div className="min-w-40 flex-1">
                                <p className="text-sm font-medium text-slate-100">{topic.name}</p>
                                <p className="text-xs text-slate-400">
                                  {topic.subtopics.length} subtopics • weight{" "}
                                  {Number(topic.difficulty_weight).toFixed(1)}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                                  onClick={() => openEditTopicDialog(subject.id, topic)}
                                  aria-label={`Edit topic ${topic.name}`}
                                >
                                  Edit
                                </Button>

                                <AlertDialog
                                  open={isDeleteOpen}
                                  onOpenChange={(open) =>
                                    setConfirmDeleteTopic(
                                      open
                                        ? { subjectId: subject.id, topicId: topic.id }
                                        : null
                                    )
                                  }
                                >
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      aria-label={`Delete topic ${topic.name}`}
                                    >
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>

                                  <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete topic?</AlertDialogTitle>
                                      <AlertDialogDescription className="text-slate-400">
                                        This will delete the topic and related questions.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>

                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-rose-600 text-white hover:bg-rose-500"
                                        onClick={() => void deleteTopic(subject.id, topic.id)}
                                        disabled={deletingTopicId === topic.id}
                                      >
                                        {deletingTopicId === topic.id
                                          ? "Deleting..."
                                          : "Delete Topic"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      className={cn(fireButtonClass, "mt-3 h-9 px-4 py-0 text-[0.62rem]")}
                      onClick={() => openCreateTopicDialog(subject.id)}
                      aria-label={`Add Topic to ${subject.name}`}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Add Topic
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}

      <Dialog open={topicDialogOpen} onOpenChange={(open) => !open && closeTopicDialog()}>
        <DialogContent className={cn(panelClass, "max-w-2xl border-white/12 text-[var(--cream)]")}>
          <DialogHeader>
            <DialogTitle>
              {topicDialogMode === "create" ? "Add Topic" : "Edit Topic"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {currentTopicDialogSubject
                ? `Subject: ${currentTopicDialogSubject.name}`
                : "Configure topic details"}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={saveTopic}>
            <div className="space-y-1.5">
              <label htmlFor="topic-name" className="text-sm text-slate-300">
                Topic Name
              </label>
              <Input
                id="topic-name"
                value={topicName}
                onChange={(event) => setTopicName(event.target.value)}
                placeholder="CPU Scheduling"
                className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">Subtopics</label>
              <SubtopicChipEditor
                value={topicSubtopics}
                onChange={setTopicSubtopics}
                placeholder="Add subtopic and press Enter"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">NLP Keyword Tags</label>
              <SubtopicChipEditor
                value={topicKeywords}
                onChange={setTopicKeywords}
                placeholder="Add NLP keyword and press Enter"
                addLabel="Add Tag"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="topic-display-order" className="text-sm text-slate-300">
                  Display Order
                </label>
                <Input
                  id="topic-display-order"
                  type="number"
                  min={0}
                  step={1}
                  value={topicDisplayOrder}
                  onChange={(event) => setTopicDisplayOrder(event.target.value)}
                  className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="topic-weight" className="text-sm text-slate-300">
                  Difficulty Weight: {topicDifficultyWeight.toFixed(1)}
                </label>
                <input
                  id="topic-weight"
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={topicDifficultyWeight}
                  onChange={(event) =>
                    setTopicDifficultyWeight(Number(event.target.value))
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className={cn(ghostButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
                onClick={closeTopicDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(fireButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
                disabled={isSavingTopic}
              >
                {isSavingTopic ? "Saving..." : "Save Topic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
