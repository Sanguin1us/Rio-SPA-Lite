import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SquarePen, Brain, Send, StopCircle, Zap, Cpu, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Configuration interface matching backend
interface AgentConfiguration {
  query_generator_model: string;
  reflection_model: string;
  answer_model: string;
  number_of_initial_queries: number;
  max_research_loops: number;
}

interface InputFormProps {
  onSubmit: (inputValue: string, config: AgentConfiguration) => void;
  onCancel: () => void;
  isLoading: boolean;
  hasHistory: boolean;
}

const MODEL_OPTIONS = [
  {
    value: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    icon: <Zap className="h-4 w-4 text-yellow-400" />,
  },
  {
    value: "gemini-2.5-flash-preview-04-17", 
    label: "Gemini 2.5 Flash",
    icon: <Zap className="h-4 w-4 text-orange-400" />,
  },
  {
    value: "gemini-2.5-pro-preview-05-06",
    label: "Gemini 2.5 Pro (May)",
    icon: <Cpu className="h-4 w-4 text-purple-400" />,
  },
  {
    value: "gemini-2.5-pro-preview-06-05",
    label: "Gemini 2.5 Pro (June)",
    icon: <Cpu className="h-4 w-4 text-purple-500" />,
  },
];

const EFFORT_PRESETS = {
  low: { queries: 1, loops: 1 },
  medium: { queries: 3, loops: 3 },
  high: { queries: 5, loops: 10 },
  custom: { queries: 3, loops: 3 },
};

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  hasHistory,
}) => {
  const [internalInputValue, setInternalInputValue] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Configuration state
  const [effort, setEffort] = useState("medium");
  const [queryGeneratorModel, setQueryGeneratorModel] = useState("gemini-2.0-flash");
  const [reflectionModel, setReflectionModel] = useState("gemini-2.5-flash-preview-04-17");
  const [answerModel, setAnswerModel] = useState("gemini-2.5-flash-preview-04-17");
  const [numberOfQueries, setNumberOfQueries] = useState(3);
  const [maxLoops, setMaxLoops] = useState(3);

  const handleInternalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!internalInputValue.trim()) return;
    
    const config: AgentConfiguration = {
      query_generator_model: queryGeneratorModel,
      reflection_model: reflectionModel,
      answer_model: answerModel,
      number_of_initial_queries: numberOfQueries,
      max_research_loops: maxLoops,
    };
    
    onSubmit(internalInputValue, config);
    setInternalInputValue("");
  };

  const handleInternalKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInternalSubmit();
    }
  };

  const handleEffortChange = (newEffort: string) => {
    setEffort(newEffort);
    if (newEffort !== "custom") {
      const preset = EFFORT_PRESETS[newEffort as keyof typeof EFFORT_PRESETS];
      setNumberOfQueries(preset.queries);
      setMaxLoops(preset.loops);
    }
  };

  const handleQueriesChange = (value: string) => {
    const num = parseInt(value) || 1;
    setNumberOfQueries(Math.max(1, Math.min(10, num)));
    setEffort("custom");
  };

  const handleLoopsChange = (value: string) => {
    const num = parseInt(value) || 1;
    setMaxLoops(Math.max(1, Math.min(20, num)));
    setEffort("custom");
  };

  const isSubmitDisabled = !internalInputValue.trim() || isLoading;

  const ModelSelector = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    label: string;
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] bg-transparent border-neutral-600">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-neutral-700 border-neutral-600 text-neutral-300">
          {MODEL_OPTIONS.map((model) => (
            <SelectItem
              key={model.value}
              value={model.value}
              className="hover:bg-neutral-600 focus:bg-neutral-600 cursor-pointer"
            >
              <div className="flex items-center">
                {model.icon}
                <span className="ml-2">{model.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form
      onSubmit={handleInternalSubmit}
      className="flex flex-col gap-3 p-3"
    >
      {/* Main input area */}
      <div className={`flex flex-row items-center justify-between text-white rounded-3xl rounded-bl-sm ${
        hasHistory ? "rounded-br-sm" : ""
      } break-words min-h-7 bg-neutral-700 px-4 pt-3`}>
        <Textarea
          value={internalInputValue}
          onChange={(e) => setInternalInputValue(e.target.value)}
          onKeyDown={handleInternalKeyDown}
          placeholder="Who won the Euro 2024 and scored the most goals?"
          className="w-full text-neutral-100 placeholder-neutral-500 resize-none border-0 focus:outline-none focus:ring-0 outline-none focus-visible:ring-0 shadow-none md:text-base min-h-[56px] max-h-[200px]"
          rows={1}
        />
        <div className="-mt-3">
          {isLoading ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2 cursor-pointer rounded-full transition-all duration-200"
              onClick={onCancel}
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              className={`${
                isSubmitDisabled
                  ? "text-neutral-500"
                  : "text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
              } p-2 cursor-pointer rounded-full transition-all duration-200 text-base`}
              disabled={isSubmitDisabled}
            >
              Search
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Configuration controls */}
      <div className="flex flex-col gap-3">
        {/* Basic controls row */}
        <div className="flex items-center justify-between">
          <div className="flex flex-row gap-2">
            {/* Effort preset selector */}
            <div className="flex flex-row gap-2 bg-neutral-700 border-neutral-600 text-neutral-300 rounded-xl pl-2">
              <div className="flex flex-row items-center text-sm">
                <Brain className="h-4 w-4 mr-2" />
                Effort
              </div>
              <Select value={effort} onValueChange={handleEffortChange}>
                <SelectTrigger className="w-[120px] bg-transparent border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-700 border-neutral-600 text-neutral-300">
                  <SelectItem value="low" className="hover:bg-neutral-600 focus:bg-neutral-600 cursor-pointer">
                    Low
                  </SelectItem>
                  <SelectItem value="medium" className="hover:bg-neutral-600 focus:bg-neutral-600 cursor-pointer">
                    Medium
                  </SelectItem>
                  <SelectItem value="high" className="hover:bg-neutral-600 focus:bg-neutral-600 cursor-pointer">
                    High
                  </SelectItem>
                  <SelectItem value="custom" className="hover:bg-neutral-600 focus:bg-neutral-600 cursor-pointer">
                    Custom
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick settings display */}
            <div className="flex items-center gap-2 bg-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-300">
              <span>{numberOfQueries} queries</span>
              <span>•</span>
              <span>{maxLoops} loops</span>
            </div>

            {/* Advanced settings toggle */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600"
            >
              <Settings className="h-4 w-4 mr-2" />
              Advanced
              {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>

          {hasHistory && (
            <Button
              className="bg-neutral-700 border-neutral-600 text-neutral-300 cursor-pointer rounded-xl pl-2"
              variant="default"
              onClick={() => window.location.reload()}
            >
              <SquarePen size={16} />
              New Search
            </Button>
          )}
        </div>

        {/* Advanced configuration panel */}
        {showAdvanced && (
          <div className="bg-neutral-700 rounded-xl p-4 border border-neutral-600">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Model selections */}
              <ModelSelector
                value={queryGeneratorModel}
                onChange={setQueryGeneratorModel}
                label="Query Generation Model"
              />
              <ModelSelector
                value={reflectionModel}
                onChange={setReflectionModel}
                label="Reflection Model"
              />
              <ModelSelector
                value={answerModel}
                onChange={setAnswerModel}
                label="Answer Model"
              />

              {/* Numeric configurations */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">Initial Queries</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={numberOfQueries}
                  onChange={(e) => handleQueriesChange(e.target.value)}
                  className="bg-transparent border-neutral-600 text-neutral-100"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">Max Research Loops</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={maxLoops}
                  onChange={(e) => handleLoopsChange(e.target.value)}
                  className="bg-transparent border-neutral-600 text-neutral-100"
                />
              </div>
            </div>

            {/* Configuration summary */}
            <div className="mt-4 pt-3 border-t border-neutral-600">
              <div className="text-xs text-neutral-400 space-y-1">
                <div>Models: {queryGeneratorModel.split('-')[1]} → {reflectionModel.split('-')[1]} → {answerModel.split('-')[1]}</div>
                <div>Research: {numberOfQueries} initial queries, up to {maxLoops} loops</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};