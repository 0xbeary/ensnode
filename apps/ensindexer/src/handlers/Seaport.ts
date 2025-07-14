import { Context } from "ponder:registry";
import schema from "ponder:schema";
import { ItemType } from "@opensea/seaport-js/lib/constants";

import { sharedEventValues, upsertAccount } from "@/lib/db-helpers";
import { EventWithArgs } from "@/lib/ponder-helpers";
import { upsertCurrency } from "@/lib/seaport/seaport-helpers";
import { Address, Hex } from "viem";

// Supported contracts
const SUPPORTED_CONTRACTS: Address[] = [
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
  "0x0635513f179D50A207757E05759CbD106d7dFcE8",
];

type OfferItem = {
  itemType: ItemType;
  token: Address;       // contract address
  identifier: bigint;   // token id
  amount: bigint;
};

type ConsiderationItem = {
  itemType: ItemType;
  token: Address;       // contract address
  identifier: bigint;   // token id
  amount: bigint;
};

interface SeaportOrderFulfilledEvent
  extends EventWithArgs<{
    orderHash: Hex;
    offerer: Address;
    zone: Address;        // the zone contract this order was created in
    recipient: Address;
    offer: readonly OfferItem[];
    consideration: readonly ConsiderationItem[];
  }> {}

/**
 * Handles NFT offers being fulfilled (someone accepting an offer)
 * In an offer: NFT holder accepts someone's offer to buy their NFT
 * - NFT is in consideration (what the offerer wants)
 * - Payment is in offer (what the offerer gives)
 */
async function handleOfferFulfilled(
  context: Context,
  event: SeaportOrderFulfilledEvent,
  nftItem: ConsiderationItem,
  payment: OfferItem,
) {
  const { orderHash, offerer, recipient } = event.args;

  // In an offer, the offerer is buying the NFT, recipient is selling
  const buyer = offerer;
  const seller = recipient;

  // Ensure accounts exist
  await upsertAccount(context, buyer);
  await upsertAccount(context, seller);

  // Get currency info
  const currencyId = await upsertCurrency(context, payment.token);

  // Record the sale
  await context.db.insert(schema.nameSold).values({
    ...sharedEventValues(context.chain.id, event),
    fromOwnerId: seller,
    newOwnerId: buyer,
    currencyId: currencyId,
    chainId: context.chain.id,
    orderHash: orderHash,
    price: payment.amount,
    tokenContract: nftItem.token,
    tokenId: nftItem.identifier.toString(),
    itemType: nftItem.itemType === ItemType.ERC721 ? "ERC721" : "ERC1155",
  });
}

/**
 * Handles NFT listings being fulfilled (someone buying a listed item)
 * In a listing: NFT owner lists their NFT for sale
 * - NFT is in offer (what the offerer gives)
 * - Payment is in consideration (what the offerer wants)
 */
async function handleListingFulfilled(
  context: Context,
  event: SeaportOrderFulfilledEvent,
  nftItem: OfferItem,
  payment: ConsiderationItem,
) {
  const { orderHash, offerer, recipient } = event.args;

  // In a listing, the offerer is selling the NFT, recipient is buying
  const seller = offerer;
  const buyer = recipient;

  // Ensure accounts exist
  await upsertAccount(context, seller);
  await upsertAccount(context, buyer);

  // Get currency info
  const currencyId = await upsertCurrency(context, payment.token);

  // Record the sale
  await context.db.insert(schema.nameSold).values({
    ...sharedEventValues(context.chain.id, event),
    fromOwnerId: seller,
    newOwnerId: buyer,
    currencyId: currencyId,
    chainId: context.chain.id,
    orderHash: orderHash,
    price: payment.amount,
    tokenContract: nftItem.token,
    tokenId: nftItem.identifier.toString(),
    itemType: nftItem.itemType === ItemType.ERC721 ? "ERC721" : "ERC1155",
  });
}

/**
 * Validates if an NFT item is supported
 */
function isIndexable(item: OfferItem | ConsiderationItem): boolean {
  if (!item || !item.token) return false;

  const isValidItemType = item.itemType === ItemType.ERC721 || item.itemType === ItemType.ERC1155;
  const isSupportedContract = SUPPORTED_CONTRACTS.includes(item.token);

  return isValidItemType && isSupportedContract;
}

/**
 * Finds the payment item from offer array
 */
function findPaymentInOffer(offer: readonly OfferItem[]): OfferItem | undefined {
  return offer.find(
    (item) => item.itemType === ItemType.NATIVE || item.itemType === ItemType.ERC20,
  );
}

/**
 * Finds the payment item from consideration array (only support NATIVE and ERC20)
 */
function findPaymentInConsideration(
  consideration: readonly ConsiderationItem[],
): ConsiderationItem | undefined {
  return consideration.find(
    (item) => item.itemType === ItemType.NATIVE || item.itemType === ItemType.ERC20,
  );
}

/**
 * Main handler for Seaport OrderFulfilled events
 */
export async function handleOrderFulfilled({
  context,
  event,
}: {
  context: Context;
  event: SeaportOrderFulfilledEvent;
}) {
  const { offer, consideration } = event.args;

  // Check if this is a listing (NFT in offer, payment in consideration)
  const nftInOffer = offer.find(isIndexable);
  const paymentInConsideration = findPaymentInConsideration(consideration);

  if (nftInOffer && paymentInConsideration) {
    await handleListingFulfilled(context, event, nftInOffer, paymentInConsideration);
    return;
  }

  // Check if this is an offer (payment in offer, NFT in consideration)
  const paymentInOffer = findPaymentInOffer(offer);
  const nftInConsideration = consideration.find(isIndexable);

  if (paymentInOffer && nftInConsideration) {
    await handleOfferFulfilled(context, event, nftInConsideration, paymentInOffer);
    return;
  }
}
