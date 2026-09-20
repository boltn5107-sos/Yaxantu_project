<?php

namespace App\Http\Controllers\Api\V1\Address;

use App\Http\Controllers\Api\V1\Controller;
use App\Http\Requests\Api\V1\Address\StoreAddressRequest;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AddressController extends Controller
{
    /**
     * Adresses du compte courant.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return AddressResource::collection(
            $request->user()->addresses()->orderByDesc('is_default')->orderByDesc('updated_at')->get(),
        );
    }

    public function store(StoreAddressRequest $request): AddressResource
    {
        $data = $request->validated();

        if ($data['is_default'] ?? false) {
            $request->user()->addresses()->where('type', $data['type'] ?? 'shipping')->update(['is_default' => false]);
        }

        $address = $request->user()->addresses()->create($data);

        return (new AddressResource($address))
            ->additional(['message' => 'Adresse enregistrée.']);
    }

    public function update(StoreAddressRequest $request, Address $address): AddressResource
    {
        abort_unless($address->user_id === $request->user()->id, 403, 'Cette adresse ne vous appartient pas.');

        $data = $request->validated();

        if ($data['is_default'] ?? false) {
            $request->user()->addresses()->where('type', $data['type'] ?? $address->type)->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        $address->update($data);

        return (new AddressResource($address))
            ->additional(['message' => 'Adresse mise à jour.']);
    }

    public function destroy(Request $request, Address $address): \Illuminate\Http\JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403, 'Cette adresse ne vous appartient pas.');

        $address->delete();

        return response()->json(['message' => 'Adresse supprimée.']);
    }
}