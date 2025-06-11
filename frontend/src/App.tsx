import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";

// Configuration interface matching backend
interface AgentConfiguration {
  query_generator_model: string;
  reflection_model: string;
  answer_model: string;
  number_of_initial_queries: number;
  max_research_loops: number;
  enable_thinking?: boolean;
}

export default function App() {
  const [processedEventsTimeline, setProcessedEventsTimeline] = useState<
    ProcessedEvent[]
  >([]);
  const [historicalActivities, setHistoricalActivities] = useState<
    Record<string, ProcessedEvent[]>
  >({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasFinalizeEventOccurredRef = useRef(false);

  const thread = useStream<{
    messages: Message[];
  }>({
    apiUrl: import.meta.env.DEV
      ? "http://localhost:2024"
      : "http://localhost:8123",
    assistantId: "agent",
    messagesKey: "messages",
    onFinish: (event: any) => {
      console.log("Stream finished:", event);
    },
    onUpdateEvent: (event: any) => {
      console.log("Event received:", event); // Debug log
      
      let processedEvent: ProcessedEvent | null = null;
      
      // Check the event structure - LangGraph events have different formats
      const eventType = event.event || event.type;
      const eventName = event.name;
      const eventData = event.data;
      
      // Handle different event types from LangGraph
      if (eventType === "on_chain_end" || eventType === "on_chain_start") {
        if (eventName === "generate_query" && eventData) {
          if (eventData.output && eventData.output.query_list) {
            processedEvent = {
              title: "Generating Search Queries",
              data: eventData.output.query_list.join(", "),
            };
          } else if (eventType === "on_chain_start") {
            processedEvent = {
              title: "Generating Search Queries",
              data: "Creating search queries...",
            };
          }
        } else if (eventName === "web_research" && eventData) {
          if (eventData.output) {
            const sources = eventData.output.sources_gathered || [];
            const numSources = sources.length;
            const uniqueLabels = [
              ...new Set(sources.map((s: any) => s.label).filter(Boolean)),
            ];
            const exampleLabels = uniqueLabels.slice(0, 3).join(", ");
            processedEvent = {
              title: "Web Research",
              data: `Gathered ${numSources} sources. Related to: ${
                exampleLabels || "N/A"
              }.`,
            };
          } else if (eventType === "on_chain_start") {
            processedEvent = {
              title: "Web Research",
              data: "Searching the web...",
            };
          }
        } else if (eventName === "reflection" && eventData) {
          if (eventData.output) {
            processedEvent = {
              title: "Reflection",
              data: eventData.output.is_sufficient
                ? "Search successful, generating final answer."
                : `Need more information, searching for ${eventData.output.follow_up_queries?.join(
                    ", "
                  ) || "additional info"}`,
            };
          } else if (eventType === "on_chain_start") {
            processedEvent = {
              title: "Reflection",
              data: "Analyzing gathered information...",
            };
          }
        } else if (eventName === "finalize_answer") {
          if (eventType === "on_chain_start") {
            processedEvent = {
              title: "Finalizing Answer",
              data: "Composing and presenting the final answer.",
            };
            hasFinalizeEventOccurredRef.current = true;
          }
        }
      }
      
      // Fallback: try the original event structure for backwards compatibility
      if (!processedEvent) {
        if (event.generate_query) {
          processedEvent = {
            title: "Generating Search Queries",
            data: event.generate_query.query_list?.join(", ") || "Creating queries...",
          };
        } else if (event.web_research) {
          const sources = event.web_research.sources_gathered || [];
          const numSources = sources.length;
          const uniqueLabels = [
            ...new Set(sources.map((s: any) => s.label).filter(Boolean)),
          ];
          const exampleLabels = uniqueLabels.slice(0, 3).join(", ");
          processedEvent = {
            title: "Web Research",
            data: `Gathered ${numSources} sources. Related to: ${
              exampleLabels || "N/A"
            }.`,
          };
        } else if (event.reflection) {
          processedEvent = {
            title: "Reflection",
            data: event.reflection.is_sufficient
              ? "Search successful, generating final answer."
              : `Need more information, searching for ${event.reflection.follow_up_queries?.join(
                  ", "
                ) || "additional info"}`,
          };
        } else if (event.finalize_answer) {
          processedEvent = {
            title: "Finalizing Answer",
            data: "Composing and presenting the final answer.",
          };
          hasFinalizeEventOccurredRef.current = true;
        }
      }
      
      if (processedEvent) {
        console.log("Adding processed event:", processedEvent); // Debug log
        setProcessedEventsTimeline((prevEvents) => [
          ...prevEvents,
          processedEvent!,
        ]);
      }
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [thread.messages]);

  useEffect(() => {
    if (
      hasFinalizeEventOccurredRef.current &&
      !thread.isLoading &&
      thread.messages.length > 0
    ) {
      const lastMessage = thread.messages[thread.messages.length - 1];
      if (lastMessage && lastMessage.type === "ai" && lastMessage.id) {
        console.log("Moving events to historical:", processedEventsTimeline); // Debug log
        setHistoricalActivities((prev) => ({
          ...prev,
          [lastMessage.id!]: [...processedEventsTimeline],
        }));
      }
      hasFinalizeEventOccurredRef.current = false;
    }
  }, [thread.messages, thread.isLoading, processedEventsTimeline]);

  const handleSubmit = useCallback(
    (submittedInputValue: string, config: AgentConfiguration) => {
      if (!submittedInputValue.trim()) return;
      
      console.log("Submitting new request, clearing timeline"); // Debug log
      setProcessedEventsTimeline([]);
      hasFinalizeEventOccurredRef.current = false;

      const newMessages: Message[] = [
        ...(thread.messages || []),
        {
          type: "human",
          content: submittedInputValue,
          id: Date.now().toString(),
        },
      ];
      
      console.log("Submitting with config:", config); // Debug log
      
      // Submit with messages and configuration
      thread.submit(
        { messages: newMessages },
        {
          configurable: {
            query_generator_model: config.query_generator_model,
            reflection_model: config.reflection_model,
            answer_model: config.answer_model,
            number_of_initial_queries: config.number_of_initial_queries,
            max_research_loops: config.max_research_loops,
            enable_thinking: config.enable_thinking || false,
          },
        }
      );
    },
    [thread]
  );

  const handleCancel = useCallback(() => {
    thread.stop();
    window.location.reload();
  }, [thread]);

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full">
        <div
          className={`flex-1 overflow-y-auto ${
            thread.messages.length === 0 ? "flex" : ""
          }`}
        >
          {thread.messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              isLoading={thread.isLoading}
              onCancel={handleCancel}
            />
          ) : (
            <ChatMessagesView
              messages={thread.messages}
              isLoading={thread.isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              liveActivityEvents={processedEventsTimeline}
              historicalActivities={historicalActivities}
            />
          )}
        </div>
      </main>
    </div>
  );
}