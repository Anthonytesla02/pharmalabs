import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Search } from "lucide-react";
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

interface DrugDatabaseProps {
  drugs: Drug[];
  onRefresh: () => void;
}

export default function DrugDatabase({ drugs, onRefresh }: DrugDatabaseProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drugs;
    return drugs.filter(
      (d) =>
        d.brand_name.toLowerCase().includes(q) ||
        d.active_ingredient.toLowerCase().includes(q) ||
        (d.drug_group && d.drug_group.toLowerCase().includes(q))
    );
  }, [drugs, search]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("drugs").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Drug removed");
      onRefresh();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search brand, ingredient, or group…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground px-1">
        {filtered.length} of {drugs.length} drug{drugs.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-surface p-8 text-center text-muted-foreground">
          {drugs.length === 0
            ? "No drugs yet. Add your first drug in the Lab tab."
            : "No drugs match your search."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((drug) => (
            <div
              key={drug.id}
              className="card-surface-hover p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">
                    {drug.brand_name}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Lvl {Math.min(5, Math.floor(drug.mastery_score / 20) + 1)}
                  </span>
                </div>
                <p className="text-sm font-mono-clinical text-muted-foreground mt-0.5">
                  {drug.active_ingredient}
                </p>
                {drug.drug_group && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {drug.drug_group}
                  </p>
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
  );
}
