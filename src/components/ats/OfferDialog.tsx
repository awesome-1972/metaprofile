import { useEffect, useState } from "react";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useOfferByApplication,
  useSaveOffer,
  offerStatusLabel,
  offerStatusColor,
  type OfferStatus,
} from "@/hooks/ats/use-offers";

const STATUS_OPTIONS: OfferStatus[] = ["draft", "sent", "accepted", "declined", "expired", "rescinded"];

interface OfferDialogProps {
  applicationId: string;
  candidateName?: string;
}

/** Офер по заявці — статус, умови, дата старту. Тригер показує поточний статус. */
export function OfferDialog({ applicationId, candidateName }: OfferDialogProps) {
  const { data: offer } = useOfferByApplication(applicationId);
  const saveOffer = useSaveOffer();
  const [open, setOpen] = useState(false);

  const [status, setStatus] = useState<OfferStatus>("draft");
  const [termsNote, setTermsNote] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (open) {
      setStatus(offer?.status ?? "draft");
      setTermsNote(offer?.terms_note ?? "");
      setStartDate(offer?.start_date ?? "");
    }
  }, [open, offer]);

  const handleSave = () => {
    saveOffer.mutate(
      { applicationId, offerId: offer?.id, status, termsNote: termsNote.trim() || null, startDate: startDate || null, current: offer },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FileSignature className="h-3.5 w-3.5 mr-1.5" />
        Офер
        {offer && (
          <Badge className={`ml-1.5 text-[10px] ${offerStatusColor[offer.status]}`}>{offerStatusLabel[offer.status]}</Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Офер{candidateName ? ` — ${candidateName}` : ""}</DialogTitle>
            <DialogDescription>Умови оферу та його статус. Дати надсилання/відповіді проставляються автоматично на переходах.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Статус</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OfferStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{offerStatusLabel[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-start">Дата виходу</Label>
              <Input id="offer-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-terms">Умови оферу</Label>
              <Textarea
                id="offer-terms"
                value={termsNote}
                onChange={(e) => setTermsNote(e.target.value)}
                placeholder="Позиція, компенсація, бонуси, умови…"
                className="min-h-[100px]"
              />
            </div>
            {(offer?.offer_sent_at || offer?.responded_at) && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                {offer.offer_sent_at && <div>Надіслано: {new Date(offer.offer_sent_at).toLocaleString("uk-UA")}</div>}
                {offer.responded_at && <div>Відповідь: {new Date(offer.responded_at).toLocaleString("uk-UA")}</div>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={saveOffer.isPending}>
              {saveOffer.isPending ? "Збереження…" : "Зберегти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
