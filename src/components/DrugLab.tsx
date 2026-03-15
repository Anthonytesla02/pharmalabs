import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Trash2, Loader2, X } from "lucide-react";
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
  const [brandNames, setBrandNames] = useState<string[]>([""]);
  const [activeIngredient, setActiveIngredient] = useState("");
  const [drugGroup, setDrugGroup] = useState("");
  const [indications, setIndications] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateBrandName = (index: number, value: string) => {
    setBrandNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const addBrandField = () => setBrandNames((prev) => [...prev, ""]);

  const removeBrandField = (index: number) => {
    if (brandNames.length <= 1) return;
    setBrandNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEnrich = async () => {
    const searchTerm = brandNames[0]?.trim() || activeIngredient.trim();
    if (!searchTerm) {
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

      // If AI returned brand_names array, merge with existing
      if (data.brand_names && Array.isArray(data.brand_names)) {
        const existing = brandNames.filter((n) => n.trim());
        const merged = [...new Set([...existing, ...data.brand_names])];
        setBrandNames(merged.length > 0 ? merged : [""]);
      } else if (data.brand_name) {
        // Single brand returned — set first field if empty
        if (!brandNames[0]?.trim()) {
          updateBrandName(0, data.brand_name);
        }
      }

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
    const validBrands = brandNames.map((n) => n.trim()).filter(Boolean);
    if (validBrands.length === 0 || !activeIngredient.trim()) {
      toast.error("At least one brand name and active ingredient are required");
      return;
    }
    setIsSaving(true);

    const rows = validBrands.map((brand) => ({
      brand_name: brand,
      active_ingredient: activeIngredient.trim(),
      drug_group: drugGroup.trim() || null,
      indications: indications.trim() || null,
      contraindications: contraindications.trim() || null,
    }));

    const { error } = await supabase.from("drugs").insert(rows);
    setIsSaving(false);
    if (error) {
      toast.error("Failed to save drug(s)");
    } else {
      toast.success(`${validBrands.length} drug(s) added to lab`);
      clearForm();
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
    setBrandNames([""]);
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
          {/* Brand Names */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Brand Name(s)</label>
            {brandNames.map((name, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={index === 0 ? "Brand Name (e.g. Lipitor)" : "Another brand name"}
                  value={name}
                  onChange={(e) => updateBrandName(index, e.target.value)}
                  className="h-11 flex-1"
                />
                {brandNames.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBrandField(index)}
                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addBrandField}
              className="text-xs text-muted-foreground gap-1"
            >
              <Plus className="h-3 w-3" />
              Add another brand
            </Button>
          </div>

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
            Save Drug{brandNames.filter((n) => n.trim()).length > 1 ? "s" : ""}
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
