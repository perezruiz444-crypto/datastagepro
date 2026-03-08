import React, { useState, useEffect } from 'react';
import { Star, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Review {
  id: string;
  rating: number;
  comment: string;
  display_name: string;
  created_at: string;
}

const StarRating: React.FC<{ rating: number; onRate?: (r: number) => void; size?: string }> = ({ rating, onRate, size = 'h-5 w-5' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        className={`${size} transition-colors ${i <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'} ${onRate ? 'cursor-pointer hover:scale-110' : ''}`}
        onClick={() => onRate?.(i)}
      />
    ))}
  </div>
);

const Reviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setReviews(data as Review[]);
      if (data.length > 0) {
        const avg = data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      rating,
      comment,
      display_name: displayName.trim() || 'Anónimo',
      user_id: user.id,
    });
    if (!error) {
      setRating(0);
      setComment('');
      setDisplayName('');
      fetchReviews();
    }
    setSubmitting(false);
  };

  return (
    <section id="reviews" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
            Lo que dicen nuestros usuarios
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center justify-center gap-3">
              <StarRating rating={Math.round(avgRating)} />
              <span className="text-2xl font-bold text-foreground">{avgRating}</span>
              <span className="text-muted-foreground">({reviews.length} opiniones)</span>
            </div>
          )}
        </div>

        {/* Review form */}
        {user ? (
          <Card className="mb-10">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Tu calificación</label>
                  <StarRating rating={rating} onRate={setRating} size="h-7 w-7" />
                </div>
                <Input
                  placeholder="Tu nombre (opcional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="max-w-xs"
                />
                <Textarea
                  placeholder="¿Qué te pareció la app? ¿Qué te gustaría que agreguemos?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button type="submit" disabled={rating === 0 || submitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Enviando...' : 'Enviar opinión'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-10">
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Inicia sesión para dejar tu opinión</p>
            </CardContent>
          </Card>
        )}

        {/* Reviews list */}
        <div className="grid gap-4">
          {reviews.map(review => (
            <Card key={review.id} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{review.display_name}</span>
                    <StarRating rating={review.rating} size="h-4 w-4" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString('es-MX')}
                  </span>
                </div>
                {review.comment && <p className="text-muted-foreground text-sm">{review.comment}</p>}
              </CardContent>
            </Card>
          ))}
          {reviews.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Sé el primero en dejar una opinión 🎉</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
