import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Drug {
  id: string;
  brand_name: string;
  active_ingredient: string;
  drug_group: string | null;
  indications: string | null;
  contraindications: string | null;
  mastery_score: number;
}

interface DrugLabProps {
  drugs: Drug[];
  onRefresh: () => void;
}

export default function DrugLab({ drugs, onRefresh }: DrugLabProps) {
  const [brandName, setBrandName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [drugGroup, setDrugGroup] = useState("");
  const [indications, setIndications] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEnrich = async () => {
    const searchTerm = brandName || activeIngredient;
    if (!searchTerm.trim()) {
      toast.error("Enter a brand name or active ingredient first");
      return;
    }
    setIsEnriching(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-drug`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ drug_name: searchTerm }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to enrich");
      }
      const data = await res.json();
      setBrandName(data.brand_name || brandName);
      setActiveIngredient(data.active_ingredient || activeIngredient);
      setDrugGroup(data.drug_group || "");
      setIndications(data.indications || "");
      setContraindications(data.contraindications || "");
      toast.success("Drug info enriched by AI");
    } catch (e: any) {
      toast.error(e.message || "Enrichment failed");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSave = async () => {
    if (!brandName.trim() || !activeIngredient.trim()) {
      toast.error("Brand name and active ingredient are required");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from("drugs").insert({
      brand_name: brandName.trim(),
      active_ingredient: activeIngredient.trim(),
      drug_group: drugGroup.trim() || null,
      indications: indications.trim() || null,
      contraindications: contraindications.trim() || null,
    });
    setIsSaving(false);
    if (error) {
      toast.error("Failed to save drug");
    } else {
      toast.success("Drug added to lab");
      setBrandName("");
      setActiveIngredient("");
      setDrugGroup("");
      setIndications("");
      setContraindications("");
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("drugs").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Drug removed");
      onRefresh();
    }
  };

  const clearForm = () => {
    setBrandName("");
    setActiveIngredient("");
    setDrugGroup("");
    setIndications("");
    setContraindications("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Entry Form */}
      <div className="card-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Add Drug</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnrich}
            disabled={isEnriching}
            className="gap-2"
          >
            {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Search
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Input
            placeholder="Brand Name (e.g. Lipitor)"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="h-11"
          />
          <Input
            placeholder="Active Ingredient (e.g. Atorvastatin)"
            value={activeIngredient}
            onChange={(e) => setActiveIngredient(e.target.value)}
            className="h-11 font-mono-clinical"
          />
          <Input
            placeholder="Drug Group (e.g. Statin)"
            value={drugGroup}
            onChange={(e) => setDrugGroup(e.target.value)}
            className="h-11"
          />
          <Input
            placeholder="Indications / Uses"
            value={indications}
            onChange={(e) => setIndications(e.target.value)}
            className="h-11"
          />
          <Input
            placeholder="Contraindications"
            value={contraindications}
            onChange={(e) => setContraindications(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-11 gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save Drug
          </Button>
          <Button variant="outline" onClick={clearForm} className="h-11">
            Clear
          </Button>
        </div>
      </div>

      {/* Drug List */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground px-1">
          Drug Database ({drugs.length})
        </h2>
        {drugs.length === 0 ? (
          <div className="card-surface p-8 text-center text-muted-foreground">
            No drugs yet. Add your first drug above.
          </div>
        ) : (
          <div className="space-y-2">
            {drugs.map((drug) => (
              <div key={drug.id} className="card-surface-hover p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-foreground">{drug.brand_name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Lvl {Math.min(5, Math.floor(drug.mastery_score / 20) + 1)}
                    </span>
                  </div>
                  <p className="text-sm font-mono-clinical text-muted-foreground mt-0.5">
                    {drug.active_ingredient}
                  </p>
                  {drug.drug_group && (
                    <p className="text-xs text-muted-foreground mt-1">{drug.drug_group}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(drug.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
