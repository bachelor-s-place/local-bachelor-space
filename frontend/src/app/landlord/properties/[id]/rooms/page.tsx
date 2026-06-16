"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

type Room = {
  id: string;
  room_number?: string;
  room_type: string;
  capacity: number;
  current_occupancy: number;
  rent_amount: number;
  deposit_amount?: number;
  status: string;
};

export default function PGRoomManager() {
  const { id } = useParams();
  const router = useRouter();

  const [property, setProperty] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    room_number: "",
    room_type: "double",
    capacity: "2",
    rent_amount: "",
    deposit_amount: "",
  });

  const fetchRooms = async () => {
    const rRes = await apiFetch(`/properties/${id}/rooms`);
    setRooms(rRes.data || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pRes = await apiFetch(`/properties/${id}`);
        setProperty(pRes.data);
        await fetchRooms();
      } catch (err) {
        console.error(err);
        router.push("/landlord/properties");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        room_number: formData.room_number || null,
        room_type: formData.room_type,
        capacity: Number(formData.capacity),
        rent_amount: Number(formData.rent_amount),
        deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : undefined,
      };

      await apiFetch(`/properties/${id}/rooms`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await fetchRooms();
      setShowForm(false);
      setFormData({ room_number: "", room_type: "double", capacity: "2", rent_amount: "", deposit_amount: "" });
    } catch (err: any) {
      setError(err.message || "Failed to add room");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading room data...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/landlord/properties/${id}`} className={styles.backLink}>← Back to Property</Link>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Manage PG Rooms</h1>
            <p className={styles.subtitle}>{property?.title}</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Room"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3>Add New Room</h3>
          <form className={styles.form} onSubmit={handleAddRoom}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Room Number / Name (Optional)</label>
                <input type="text" name="room_number" value={formData.room_number} onChange={handleChange} placeholder="e.g. 101, A2" />
              </div>
              <div className={styles.inputGroup}>
                <label>Room Type</label>
                <select name="room_type" value={formData.room_type} onChange={handleChange}>
                  <option value="single">Single Sharing</option>
                  <option value="double">Double Sharing</option>
                  <option value="triple">Triple Sharing</option>
                  <option value="dormitory">Dormitory</option>
                </select>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Capacity</label>
                <input type="number" name="capacity" required min="1" value={formData.capacity} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Monthly Rent Per Bed (₹)</label>
                <input type="number" name="rent_amount" required min="0" value={formData.rent_amount} onChange={handleChange} />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Deposit Amount (₹) (Optional)</label>
              <input type="number" name="deposit_amount" min="0" value={formData.deposit_amount} onChange={handleChange} />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Adding..." : "Save Room"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.roomsList}>
        {rooms.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No rooms added yet. Click &quot;+ Add Room&quot; to get started.</p>
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className={styles.roomCard}>
              <div className={styles.roomHeader}>
                <h3 className={styles.roomTitle}>
                  {room.room_number ? `Room ${room.room_number}` : "Unnamed Room"}
                </h3>
                <span className={styles.badge}>{room.status}</span>
              </div>
              <div className={styles.roomDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Type</span>
                  <span className={styles.value} style={{ textTransform: "capitalize" }}>{room.room_type}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Occupancy</span>
                  <span className={styles.value}>{room.current_occupancy} / {room.capacity}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Rent/Bed</span>
                  <span className={styles.value}>₹{room.rent_amount}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
