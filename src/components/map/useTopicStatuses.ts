"use client";

import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { topicStatuses, type TopicStatus } from "@/lib/conceptMap";
import { listQuizAttempts } from "@/lib/storage/progress";

/** Each topic's status from this student's quiz and worksheet scores (synced, so per account). */
export function useTopicStatuses(): Map<string, TopicStatus> {
  const dataVersion = useDataVersion();
  const [statuses, setStatuses] = useState<Map<string, TopicStatus>>(new Map());
  useEffect(() => {
    listQuizAttempts()
      .then((attempts) => setStatuses(topicStatuses(attempts)))
      .catch(() => setStatuses(new Map()));
  }, [dataVersion]);
  return statuses;
}
