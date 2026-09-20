<?php

namespace Tests\Feature\Api\Seller;

use App\Enums\ReviewStatus;
use App\Enums\Role;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerReviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
    }

    private function sellerUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return $user;
    }

    private function buyer(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Buyer);

        return $user;
    }

    private function seller(string $productName = 'Article Noté', array $overrides = []): array
    {
        $user = $this->sellerUser();
        $seller = Seller::factory()->create(array_merge([
            'user_id' => $user->id,
            'status' => 'active',
        ], $overrides));

        $category = Category::query()->firstOrFail();
        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => $productName,
            'stock_quantity' => 5,
        ]);

        return [$user, $seller, $product];
    }

    private function approvedReview(Product $product, User $buyer): Review
    {
        return Review::factory()->create([
            'product_id' => $product->id,
            'user_id' => $buyer->id,
            'seller_id' => $product->seller_id,
            'rating' => 5,
            'content' => 'Très satisfaite du produit.',
            'status' => ReviewStatus::Approved->value,
            'is_approved' => true,
        ]);
    }

    public function test_seller_lists_reviews_of_his_products(): void
    {
        [$user, $seller, $product] = $this->seller();
        $this->approvedReview($product, $this->buyer());

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/seller/reviews')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->assertSame('Article Noté', $response->json('data.0.product.name'));
        $this->assertNull($response->json('data.0.reply'));
    }

    public function test_seller_replies_to_an_approved_review(): void
    {
        [$user, $_seller, $product] = $this->seller();
        $review = $this->approvedReview($product, $this->buyer());

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/reviews/'.$review->id.'/reply', [
                'content' => 'Merci pour votre confiance !',
            ])
            ->assertOk()
            ->assertJsonPath('data.reply.content', 'Merci pour votre confiance !');

        $this->assertDatabaseHas('reviews', [
            'parent_id' => $review->id,
            'product_id' => $product->id,
            'status' => ReviewStatus::Approved->value,
        ]);

        $reply = Review::where('parent_id', $review->id)->firstOrFail();
        $this->assertNull($reply->rating);
    }

    public function test_reply_appears_in_public_reviews_index(): void
    {
        [$sellerUser, $seller, $product] = $this->seller();
        $buyer = $this->buyer();
        $review = $this->approvedReview($product, $buyer);

        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/reviews/'.$review->id.'/reply', [
                'content' => 'Réponse du vendeur.',
            ]);

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/v1/products/'.$product->slug.'/reviews')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reply.content', 'Réponse du vendeur.');
    }

    public function test_reply_updates_existing_response(): void
    {
        [$user, $_seller, $product] = $this->seller();
        $review = $this->approvedReview($product, $this->buyer());

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/reviews/'.$review->id.'/reply', ['content' => 'Réponse 1']);
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/reviews/'.$review->id.'/reply', ['content' => 'Réponse 2'])
            ->assertOk();

        $this->assertSame(1, Review::query()->where('parent_id', $review->id)->count());
        $this->assertSame('Réponse 2', Review::query()->where('parent_id', $review->id)->first()->content);
    }

    public function test_seller_cannot_reply_to_another_sellers_review(): void
    {
        [$sellerAUser, $sellerA, $productA] = $this->seller();
        [$sellerBUser] = $this->seller('Article Autre');

        $review = $this->approvedReview($productA, $this->buyer());
        $this->assertSame((int) $sellerA->id, (int) $review->seller_id);

        $this->actingAs($sellerBUser, 'sanctum')
            ->postJson('/api/v1/seller/reviews/'.$review->id.'/reply', ['content' => 'Bla'])
            ->assertForbidden();
    }

    public function test_seller_cannot_reply_to_a_pending_review(): void
    {
        [$user, $_seller, $product] = $this->seller();
        $buyer = $this->buyer();

        $review = Review::factory()->create([
            'product_id' => $product->id,
            'user_id' => $buyer->id,
            'seller_id' => $product->seller_id,
            'rating' => 2,
            'status' => ReviewStatus::Pending->value,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/reviews/'.$review->id.'/reply', ['content' => 'Réponse'])
            ->assertUnprocessable();
    }
}