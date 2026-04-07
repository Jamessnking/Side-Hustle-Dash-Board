import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Layout, Plus, Trash2, Edit, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PageHeader, EmptyState, StatusBadge } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'text-muted-foreground' },
  { id: 'doing', label: 'In Progress', color: 'text-blue-400' },
  { id: 'done', label: 'Done', color: 'text-green-400' },
];

const PRIORITIES = ['low', 'medium', 'high'];

function KanbanCard({ card, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.card_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const priorityColor = {
    low: 'text-muted-foreground',
    medium: 'text-yellow-400',
    high: 'text-red-400'
  }[card.priority] || '';

  return (
    <div ref={setNodeRef} style={style} data-testid="kanban-card"
      className="rounded-lg border border-border/50 bg-surface-2 p-3 group">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab">
          <GripVertical className="w-3 h-3" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">{card.title}</p>
          {card.description && <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {card.priority && <span className={`text-xs font-medium ${priorityColor}`}>{card.priority}</span>}
            {(card.tags || []).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={() => onEdit(card)} className="p-1 text-muted-foreground hover:text-foreground"><Edit className="w-3 h-3" /></button>
          <button onClick={() => onDelete(card.card_id)} className="p-1 text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanPlanner() {
  const [cards, setCards] = useState([]);
  const [showAdd, setShowAdd] = useState(null); // column id
  const [newCard, setNewCard] = useState({ title: '', description: '', priority: 'medium', tags: '' });
  const [editCard, setEditCard] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadCards = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/kanban/cards`);
      setCards(r.data);
    } catch (e) {}
  };

  useEffect(() => { loadCards(); }, []);

  const handleCreate = async (column) => {
    if (!newCard.title) { toast.error('Enter a title'); return; }
    try {
      const tags = newCard.tags.split(',').map(t => t.trim()).filter(Boolean);
      await axios.post(`${BACKEND_URL}/api/kanban/cards`, { ...newCard, column, tags });
      toast.success('Card added!');
      setNewCard({ title: '', description: '', priority: 'medium', tags: '' });
      setShowAdd(null);
      loadCards();
    } catch (e) { toast.error('Failed to add card'); }
  };

  const handleDelete = async (id) => {
    await axios.delete(`${BACKEND_URL}/api/kanban/cards/${id}`);
    toast.success('Card deleted');
    loadCards();
  };

  const handleEdit = (card) => {
    setEditCard(card);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${BACKEND_URL}/api/kanban/cards/${editCard.card_id}`, {
        title: editCard.title,
        description: editCard.description,
        priority: editCard.priority,
        tags: editCard.tags
      });
      toast.success('Updated!');
      setEditCard(null);
      loadCards();
    } catch (e) { toast.error('Failed to update'); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    
    const cardId = active.id;
    const targetColumn = over.data?.current?.column || over.id;
    
    if (COLUMNS.map(c => c.id).includes(targetColumn)) {
      try {
        await axios.put(`${BACKEND_URL}/api/kanban/cards/${cardId}`, { column: targetColumn });
        loadCards();
      } catch (e) {}
    }
  };

  const getColumnCards = (column) => cards.filter(c => c.column === column);

  return (
    <div data-testid="kanban-planner-page">
      <PageHeader
        title="Planner"
        description="Manage tasks, track progress and organise your side hustles"
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={e => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="kanban-board">
          {COLUMNS.map(col => {
            const colCards = getColumnCards(col.id);
            return (
              <div key={col.id} className="rounded-xl border border-border/70 bg-card p-4" data-testid={`kanban-column-${col.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={col.id} />
                    <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                    <span className="text-xs text-muted-foreground">({colCards.length})</span>
                  </div>
                  <button onClick={() => setShowAdd(col.id)} className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showAdd === col.id && (
                  <div className="rounded-lg border border-border/50 bg-surface-2 p-3 mb-2">
                    <Input value={newCard.title} onChange={e => setNewCard({...newCard, title: e.target.value})}
                      placeholder="Card title..." className="text-xs bg-card mb-2" autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleCreate(col.id)} />
                    <Input value={newCard.description} onChange={e => setNewCard({...newCard, description: e.target.value})}
                      placeholder="Description (optional)" className="text-xs bg-card mb-2" />
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select value={newCard.priority} onChange={e => setNewCard({...newCard, priority: e.target.value})}
                        className="h-8 rounded-lg border border-border/70 bg-card text-xs text-foreground px-2">
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <Input value={newCard.tags} onChange={e => setNewCard({...newCard, tags: e.target.value})}
                        placeholder="tags" className="text-xs bg-card" />
                    </div>
                    <div className="flex gap-1.5">
                      <Button onClick={() => handleCreate(col.id)} size="sm"
                        className="flex-1 bg-primary text-primary-foreground text-xs h-7">Add</Button>
                      <Button onClick={() => setShowAdd(null)} variant="ghost" size="sm" className="h-7 px-2">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <SortableContext items={colCards.map(c => c.card_id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 min-h-20">
                    {colCards.length === 0 ? (
                      <div className="h-16 flex items-center justify-center rounded-lg border border-dashed border-border/50">
                        <p className="text-xs text-muted-foreground/50">Drop here</p>
                      </div>
                    ) : (
                      colCards.map(card => (
                        <KanbanCard key={card.card_id} card={card} onDelete={handleDelete} onEdit={handleEdit} />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>

      {/* Edit Card Modal */}
      {editCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border/70 p-5 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Edit Card</h3>
              <button onClick={() => setEditCard(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Input value={editCard.title} onChange={e => setEditCard({...editCard, title: e.target.value})}
                placeholder="Title" className="text-xs bg-surface-2" />
              <textarea value={editCard.description || ''} onChange={e => setEditCard({...editCard, description: e.target.value})}
                placeholder="Description" className="w-full rounded-lg border border-border/70 bg-surface-2 p-2.5 text-xs text-foreground resize-none h-20" />
              <div className="grid grid-cols-2 gap-2">
                <select value={editCard.priority || 'medium'} onChange={e => setEditCard({...editCard, priority: e.target.value})}
                  className="h-9 rounded-lg border border-border/70 bg-surface-2 text-xs text-foreground px-2">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={editCard.column} onChange={e => setEditCard({...editCard, column: e.target.value})}
                  className="h-9 rounded-lg border border-border/70 bg-surface-2 text-xs text-foreground px-2">
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <Input
                value={Array.isArray(editCard.tags) ? editCard.tags.join(', ') : editCard.tags || ''}
                onChange={e => setEditCard({...editCard, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                placeholder="Tags" className="text-xs bg-surface-2" />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveEdit} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
              <Button onClick={() => setEditCard(null)} variant="outline" className="border-border/70">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
