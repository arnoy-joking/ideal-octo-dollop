"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Goal, Edit, Check, Sparkles, Loader2 } from "lucide-react";
import { useUser } from "@/context/user-context";
import { getGoalsAction, saveGoalsAction } from "@/app/actions/goals-actions";
import { suggestGoalEdits } from "@/ai/flows/goals-flow";
import { useToast } from "@/hooks/use-toast";

const defaultGoals = "1. Finish the React course by the end of the month.\n2. Build a small project using Next.js.\n3. Get comfortable with TypeScript.";

export function GoalsCard() {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [goals, setGoals] = useState("");
  const [editedGoals, setEditedGoals] = useState("");

  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      getGoalsAction(currentUser.id).then(userGoals => {
        const initialGoals = userGoals || defaultGoals;
        setGoals(initialGoals);
        setEditedGoals(initialGoals);
        setIsLoading(false);
      });
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    await saveGoalsAction(currentUser.id, editedGoals);
    setGoals(editedGoals);
    setIsSaving(false);
    setIsEditing(false);
    toast({ title: "Goals Saved", description: "Your learning goals have been updated." });
  };

  const handleEdit = () => {
    setEditedGoals(goals);
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setEditedGoals(goals);
    setIsEditing(false);
  }

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    try {
        const suggestion = await suggestGoalEdits(editedGoals);
        if (suggestion?.revisedGoals) {
            setEditedGoals(suggestion.revisedGoals);
            toast({ title: "Suggestions Applied", description: "The AI has refined your goals. Review and save them." });
        }
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not generate suggestions. Please try again.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Goal />
          Learning Goals
        </CardTitle>
        <CardDescription>
          Set personal goals to stay focused. Saved to your profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-2 min-h-[120px] p-3">
                <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-6 w-full bg-muted rounded animate-pulse" />
                <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
            </div>
        ) : isEditing ? (
          <Textarea
            value={editedGoals}
            onChange={(e) => setEditedGoals(e.target.value)}
            className="min-h-[120px] font-code"
            aria-label="Edit your learning goals"
            disabled={isSaving || isGenerating}
          />
        ) : (
          <div className="whitespace-pre-wrap p-3 text-sm min-h-[120px]">
            {goals}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button onClick={handleGenerateWithAI} variant="outline" size="sm" disabled={isGenerating || isSaving || !editedGoals.trim()}>
                {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                Suggest
            </Button>
            <Button onClick={handleCancel} variant="ghost" disabled={isSaving || isGenerating}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || isGenerating}>
              {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
              Save Goals
            </Button>
          </>
        ) : (
          <Button onClick={handleEdit} variant="outline">
            <Edit className="mr-2" />
            Edit Goals
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
