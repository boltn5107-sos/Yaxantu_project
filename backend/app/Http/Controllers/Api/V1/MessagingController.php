<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\Seller;
use App\Models\User;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Discussion simple acheteur ↔ vendeur (phase 4).
 *
 * Comme les messageries classiques (WhatsApp) : le texte et la note vocale
 * sont disponibles par défaut, aucune configuration. Une conversation par
 * couple (acheteur, boutique) ; les messages sont relus par polling.
 */
class MessagingController extends Controller
{
    /** Liste des conversations de l'utilisateur (récents d'abord). */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $sellerId = $user->seller?->id;

        $conversations = Conversation::query()
            ->where(function ($q) use ($user, $sellerId) {
                $q->where('buyer_id', $user->id);

                if ($sellerId !== null) {
                    $q->orWhere('seller_id', $sellerId);
                }
            })
            ->with(['buyer', 'seller', 'messages'])
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn (Conversation $c) => $this->summary($c, $user));

        return response()->json(['data' => ['conversations' => $conversations->values()]]);
    }

    /** Ouvre (ou retrouve) la discussion avec une boutique. */
    public function start(Request $request): JsonResponse
    {
        $user = $request->user();

        $sellerId = (int) $request->validate(['seller_id' => ['required', 'integer', 'exists:sellers,id']])['seller_id'];

        if ($user->seller?->id === $sellerId) {
            throw ValidationException::withMessages(['seller_id' => ['Vous ne pouvez pas discuter avec votre propre boutique.']]);
        }

        $conversation = Conversation::query()
            ->firstOrCreate(
                ['buyer_id' => $user->id, 'seller_id' => $sellerId],
                ['last_message_at' => now()],
            );

        return response()->json([
            'data' => ['conversation' => $this->summary($conversation->load(['buyer', 'seller']), $user)],
        ]);
    }

    /** Fil de la conversation + passage en lu des messages reçus. */
    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $this->assertParticipant($conversation, $user);

        ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $conversation->load(['buyer', 'seller', 'messages']);

        $messages = $conversation->messages
            ->sortBy('id')
            ->values()
            ->map(fn (ChatMessage $m) => $this->message($m, $user));

        return response()->json([
            'data' => [
                'conversation' => $this->summary($conversation, $user),
                'messages' => $messages,
            ],
        ]);
    }

    /** Envoie un message écrit et/ou une note vocale. */
    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $this->assertParticipant($conversation, $user);

        $validated = $request->validate([
            'text' => ['nullable', 'string', 'max:2000'],
            'voice_note' => ['nullable', 'file', 'mimes:mp3,wav,oga,m4a,webm', 'max:10240'],
        ]);

        $voicePath = null;

        if ($request->hasFile('voice_note')) {
            $voicePath = $request->file('voice_note')->store('chats', 'public');
        }

        $text = trim((string) ($validated['text'] ?? ''));

        if ($voicePath === null && $text === '') {
            throw ValidationException::withMessages([
                'text' => ['Écrivez un message ou envoyez une note vocale.'],
            ]);
        }

        $message = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'kind' => $voicePath !== null ? 'voice' : 'text',
            'text' => $voicePath !== null ? null : $text,
            'voice_path' => $voicePath,
        ]);

        $conversation->forceFill(['last_message_at' => now()])->save();

        return response()->json([
            'message' => 'Message envoyé.',
            'data' => ['message' => $this->message($message, $user)],
        ]);
    }

    private function summary(Conversation $conversation, \App\Models\User $user): array
    {
        $counterpart = $conversation->counterpart($user);
        $last = $conversation->messages->first();

        $unread = $conversation->messages
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->count();

        return [
            'id' => $conversation->id,
            'partner' => $this->partner($conversation, $counterpart),
            'last_message' => $last ? $this->message($last, $user) : null,
            'unread_count' => (int) $unread,
            'updated_at' => $conversation->last_message_at?->toIso8601String(),
        ];
    }

    private function partner(Conversation $conversation, ?\Illuminate\Database\Eloquent\Model $counterpart): ?array
    {
        if ($counterpart instanceof User) {
            return [
                'name' => $counterpart->name,
                'avatar' => Media::url($counterpart->avatar_path),
                'role' => 'buyer',
                'href' => null,
            ];
        }

        if ($counterpart instanceof Seller) {
            return [
                'name' => $counterpart->shop_name,
                'avatar' => Media::url($counterpart->logo_path),
                'role' => 'seller',
                'href' => '/seller/'.$counterpart->slug,
            ];
        }

        return null;
    }

    private function message(ChatMessage $message, \App\Models\User $user): array
    {
        return [
            'id' => $message->id,
            'kind' => $message->kind,
            'text' => $message->text,
            'voice' => Media::url($message->voice_path),
            'from_me' => (int) $message->sender_id === (int) $user->id,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    private function assertParticipant(Conversation $conversation, \App\Models\User $user): void
    {
        if (! $conversation->isParticipant($user)) {
            abort(403, 'Cette discussion ne vous concerne pas.');
        }
    }
}